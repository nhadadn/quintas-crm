export default (router, { services, exceptions, database, getSchema }) => {
	const { ItemsService } = services;
	const { ServiceUnavailableException, ForbiddenException, InvalidPayloadException, NotFoundException } = exceptions;

	console.log('✅ Endpoint /pagos registrado correctamente');

	// Middleware de Rate Limiting Simple (En memoria)
	const rateLimitMap = new Map();
	const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
	const MAX_REQUESTS = 100;

	const rateLimiter = (req, res, next) => {
		const ip = req.ip || req.connection.remoteAddress;
		const now = Date.now();
		
		if (!rateLimitMap.has(ip)) {
			rateLimitMap.set(ip, []);
		}

		const timestamps = rateLimitMap.get(ip);
		const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
		
		if (validTimestamps.length >= MAX_REQUESTS) {
			console.warn(`⚠️ Rate limit exceeded for IP ${ip}`);
			return res.status(429).json({
				errors: [{
					message: "Too many requests, please try again later.",
					code: "RATE_LIMIT_EXCEEDED"
				}]
			});
		}

		validTimestamps.push(now);
		rateLimitMap.set(ip, validTimestamps);
		next();
	};

	router.use(rateLimiter);

	// =================================================================================
	// 1. GET /pagos - Listar todos los pagos con filtros
	// =================================================================================
	router.get('/', async (req, res) => {
		try {
			const schema = await getSchema();
			const pagosService = new ItemsService('pagos', { schema, accountability: req.accountability });
			
			const { estatus, fecha_vencimiento, venta_id, limit, page, sort } = req.query;

			const filter = { _and: [] };

			if (estatus) filter._and.push({ estatus: { _eq: estatus } });
			if (fecha_vencimiento) filter._and.push({ fecha_vencimiento: { _eq: fecha_vencimiento } });
			if (venta_id) filter._and.push({ venta_id: { _eq: venta_id } });

			const items = await pagosService.readByQuery({
				filter: filter._and.length > 0 ? filter : {},
				limit: limit ? parseInt(limit) : 20,
				page: page ? parseInt(page) : 1,
				sort: sort || ['fecha_vencimiento'],
				fields: ['*', 'venta_id.id', 'venta_id.cliente_id.nombre', 'venta_id.cliente_id.apellido']
			});

			res.json({ data: items });

		} catch (error) {
			console.error('❌ Error en GET /pagos:', error);
			return res.status(500).json({ errors: [{ message: error.message }] });
		}
	});

	// =================================================================================
	// 2. GET /pagos/:id - Obtener pago por ID con relación venta
	// =================================================================================
	router.get('/:id', async (req, res) => {
		try {
			const { id } = req.params;
			const schema = await getSchema();
			const pagosService = new ItemsService('pagos', { schema, accountability: req.accountability });

			const pago = await pagosService.readOne(id, {
				fields: [
					'*',
					'venta_id.*',
					'venta_id.cliente_id.*',
					'venta_id.lote_id.*'
				]
			});

			if (!pago) throw new NotFoundException(`Pago ${id} no encontrado`);

			res.json({ data: pago });

		} catch (error) {
			console.error(`❌ Error en GET /pagos/${req.params.id}:`, error);
			if (error instanceof NotFoundException) {
				return res.status(404).json({ errors: [{ message: error.message }] });
			}
			return res.status(500).json({ errors: [{ message: error.message }] });
		}
	});

	// =================================================================================
	// 3. POST /pagos - Registrar nuevo pago (Aplicar pago a cuota existente)
	// =================================================================================
	router.post('/', async (req, res) => {
		let trx;
		try {
			const { 
				venta_id, 
				pago_id, 
				monto, 
				fecha_pago, 
				metodo_pago, 
				referencia,
				notas 
			} = req.body;

			// 1. Validaciones Básicas
			if (!monto || monto <= 0) {
				throw new InvalidPayloadException("El monto debe ser positivo");
			}
			if (!venta_id && !pago_id) {
				throw new InvalidPayloadException("Debe especificar venta_id o pago_id");
			}

			const schema = await getSchema();
			const ventasService = new ItemsService('ventas', { schema, accountability: req.accountability });
			const pagosService = new ItemsService('pagos', { schema, accountability: req.accountability });

			// Iniciar Transacción
			trx = await database.transaction();

			// 2. Identificar el pago a afectar
			let pagoObjetivo;

			if (pago_id) {
				pagoObjetivo = await trx('pagos').where({ id: pago_id }).first();
				if (!pagoObjetivo) throw new NotFoundException("Pago no encontrado");
				// Validar que corresponda a la venta si se envió venta_id
				if (venta_id && pagoObjetivo.venta_id !== venta_id) {
					throw new InvalidPayloadException("El pago no pertenece a la venta especificada");
				}
			} else {
				// Buscar el pago pendiente más antiguo
				pagoObjetivo = await trx('pagos')
					.where({ venta_id: venta_id, estatus: 'pendiente' })
					.orderBy('fecha_vencimiento', 'asc')
					.first();
				
				if (!pagoObjetivo) {
					// Verificar si hay pagos "atrasados" también
					pagoObjetivo = await trx('pagos')
						.where({ venta_id: venta_id, estatus: 'atrasado' })
						.orderBy('fecha_vencimiento', 'asc')
						.first();
				}

				if (!pagoObjetivo) {
					throw new InvalidPayloadException("No se encontraron pagos pendientes para esta venta");
				}
			}

			// 3. Validar Montos
			const montoProgramado = parseFloat(pagoObjetivo.monto);
			const montoYaPagado = parseFloat(pagoObjetivo.monto_pagado || 0);
			const montoPendiente = montoProgramado - montoYaPagado;

			// Margen de error pequeño por decimales
			if (monto > (montoPendiente + 0.01)) {
				throw new InvalidPayloadException(`El monto (${monto}) excede el saldo pendiente del pago (${montoPendiente})`);
			}

			// 4. Calcular Mora
			const fechaPagoReal = new Date(fecha_pago || new Date());
			const fechaVencimiento = new Date(pagoObjetivo.fecha_vencimiento);
			let moraCalculada = parseFloat(pagoObjetivo.mora || 0);

			if (fechaPagoReal > fechaVencimiento) {
				// Lógica de Mora simple: 5% del monto total si se paga tarde
				// Solo aplicar si no se ha aplicado antes
				if (moraCalculada === 0) {
					const MORA_PORCENTAJE = 0.05;
					moraCalculada = montoProgramado * MORA_PORCENTAJE;
				}
			}

			// 5. Actualizar Pago
			const nuevoMontoPagado = montoYaPagado + parseFloat(monto);
			let nuevoEstatus = pagoObjetivo.estatus;

			// Si se cubre el total (o casi), marcar como pagado
			if (nuevoMontoPagado >= (montoProgramado - 0.01)) {
				nuevoEstatus = 'pagado';
			} else {
				// Si es parcial, sigue pendiente o atrasado
				// Podríamos tener estatus 'parcial', pero el schema dice 'pendiente, pagado, atrasado'
				// Mantenemos el estatus actual (pendiente/atrasado)
			}

			await trx('pagos').where({ id: pagoObjetivo.id }).update({
				monto_pagado: nuevoMontoPagado,
				fecha_pago: nuevoEstatus === 'pagado' ? fechaPagoReal : null, // Solo setear fecha_pago al liquidar? O fecha del último abono?
				// Schema dice `fecha_pago` DATE NULL. Generalmente es la fecha en que se liquidó.
				// Pero si hay abonos, deberíamos tener bitácora. 
				// Por ahora, actualizamos fecha_pago con la última transacción.
				fecha_pago: fechaPagoReal, 
				estatus: nuevoEstatus,
				mora: moraCalculada,
				metodo_pago: metodo_pago || pagoObjetivo.metodo_pago,
				referencia: referencia || pagoObjetivo.referencia,
				notas: notas ? (pagoObjetivo.notas ? pagoObjetivo.notas + '\n' + notas : notas) : pagoObjetivo.notas
			});

			// 6. Verificar si la Venta se liquida
			if (nuevoEstatus === 'pagado') {
				const pagosPendientes = await trx('pagos')
					.where({ venta_id: pagoObjetivo.venta_id })
					.whereNotIn('estatus', ['pagado', 'cancelado'])
					.whereNot({ id: pagoObjetivo.id }) // Excluir el actual que acabamos de pagar
					.count('id as count')
					.first();

				if (pagosPendientes.count == 0) {
					await trx('ventas').where({ id: pagoObjetivo.venta_id }).update({ estatus: 'liquidado' });
				}
			}

			await trx.commit();

			// Obtener registro actualizado
			const pagoActualizado = await pagosService.readOne(pagoObjetivo.id);

			res.json({ 
				data: pagoActualizado,
				meta: {
					message: "Pago registrado exitosamente",
					saldo_restante_pago: Math.max(0, montoProgramado - nuevoMontoPagado),
					mora_aplicada: moraCalculada > (pagoObjetivo.mora || 0),
					receipt_url: `/assets/receipts/placeholder-${pagoObjetivo.id}.pdf` // Placeholder Fase 3
				}
			});

		} catch (error) {
			if (trx) await trx.rollback();
			console.error('❌ Error en POST /pagos:', error);
			if (error instanceof InvalidPayloadException || error instanceof NotFoundException) {
				return res.status(400).json({ errors: [{ message: error.message }] });
			}
			return res.status(500).json({ errors: [{ message: error.message }] });
		}
	});

	// =================================================================================
	// 4. PATCH /pagos/:id - Actualizar pago (solo si pendiente)
	// =================================================================================
	router.patch('/:id', async (req, res) => {
		try {
			const { id } = req.params;
			const payload = req.body;
			const schema = await getSchema();
			const pagosService = new ItemsService('pagos', { schema, accountability: req.accountability });

			// Verificar estatus actual
			const pago = await pagosService.readOne(id);
			if (!pago) throw new NotFoundException("Pago no encontrado");

			if (pago.estatus === 'pagado') {
				throw new ForbiddenException("No se puede editar un pago ya liquidado. Contacte al administrador.");
			}

			// Restringir campos editables
			// No permitir cambiar venta_id o montos pagados directamente (usar flujo de caja)
			// Permitir cambiar fecha_vencimiento (prórroga), monto (ajuste), notas
			const camposPermitidos = ['fecha_vencimiento', 'monto', 'notas', 'metodo_pago', 'referencia', 'concepto'];
			
			const cleanPayload = {};
			Object.keys(payload).forEach(key => {
				if (camposPermitidos.includes(key)) cleanPayload[key] = payload[key];
			});

			if (Object.keys(cleanPayload).length === 0) {
				throw new InvalidPayloadException("No se enviaron campos válidos para actualizar");
			}

			await pagosService.updateOne(id, cleanPayload);
			res.json({ data: { id, message: "Pago actualizado" } });

		} catch (error) {
			console.error(`❌ Error en PATCH /pagos/${req.params.id}:`, error);
			if (error instanceof ForbiddenException) return res.status(403).json({ errors: [{ message: error.message }] });
			if (error instanceof NotFoundException) return res.status(404).json({ errors: [{ message: error.message }] });
			return res.status(500).json({ errors: [{ message: error.message }] });
		}
	});

	// =================================================================================
	// 5. DELETE /pagos/:id - No permitido
	// =================================================================================
	router.delete('/:id', async (req, res) => {
		return res.status(403).json({ 
			errors: [{ 
				message: "La eliminación de pagos no está permitida para mantener la integridad financiera. Use cancelaciones o notas de crédito.",
				code: "FORBIDDEN" 
			}] 
		});
	});
};

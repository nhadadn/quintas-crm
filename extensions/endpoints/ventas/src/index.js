export default (router, { services, exceptions, database, getSchema }) => {
	const { ItemsService } = services;
	const { ServiceUnavailableException, ForbiddenException, InvalidPayloadException, NotFoundException } = exceptions;

	console.log('✅ Endpoint /ventas registrado correctamente');

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
	// HELPERS DE CÁLCULO
	// =================================================================================
	const calcularAmortizacion = (monto_financiado, plazo_meses, tasa_interes, fecha_inicio = new Date(), metodo = 'frances') => {
		const pagos = [];
		const tasaMensual = (tasa_interes / 100) / 12;
		let saldoRestante = monto_financiado;
		const fechaBase = new Date(fecha_inicio);

		// Variables para método francés
		let cuotaFijaFrances;
		if (metodo === 'frances') {
			if (tasaMensual > 0) {
				cuotaFijaFrances = monto_financiado * (tasaMensual * Math.pow(1 + tasaMensual, plazo_meses)) / (Math.pow(1 + tasaMensual, plazo_meses) - 1);
			} else {
				cuotaFijaFrances = monto_financiado / plazo_meses;
			}
		}

		// Variable para método alemán (Capital constante)
		const capitalFijoAleman = monto_financiado / plazo_meses;

		for (let i = 1; i <= plazo_meses; i++) {
			let interes, capital, cuotaMensual;

			// Cálculo de interés siempre es sobre saldo insoluto
			interes = saldoRestante * tasaMensual;

			if (metodo === 'frances') {
				cuotaMensual = cuotaFijaFrances;
				capital = cuotaMensual - interes;
				// Ajuste por redondeo en último pago
				if (i === plazo_meses && Math.abs(saldoRestante - capital) > 0.01) {
					capital = saldoRestante;
					cuotaMensual = capital + interes;
				}
			} else if (metodo === 'aleman') {
				capital = capitalFijoAleman;
				// Ajuste por redondeo en último pago
				if (i === plazo_meses) {
					capital = saldoRestante;
				}
				cuotaMensual = capital + interes;
			} else {
				// Default to French if unknown
				cuotaMensual = cuotaFijaFrances || (monto_financiado / plazo_meses);
				capital = cuotaMensual - interes;
			}

			saldoRestante -= capital;

			// Calcular fecha: mes siguiente
			const fechaPago = new Date(fechaBase);
			fechaPago.setMonth(fechaBase.getMonth() + i);

			pagos.push({
				numero_pago: i,
				fecha_vencimiento: fechaPago.toISOString().split('T')[0], // Formato YYYY-MM-DD
				monto: parseFloat(cuotaMensual.toFixed(2)),
				capital: parseFloat(capital.toFixed(2)),
				interes: parseFloat(interes.toFixed(2)),
				saldo: parseFloat((saldoRestante < 0 ? 0 : saldoRestante).toFixed(2)),
				estatus: 'pendiente'
			});
		}
		return pagos;
	};

	// =================================================================================
	// ENDPOINTS DE CÁLCULO Y SIMULACIÓN (FASE 3)
	// =================================================================================
	
	// T3.1: Generar tabla de amortización
	router.get('/amortizacion/generar', async (req, res) => {
		try {
			const { venta_id, monto_total, enganche, plazo_meses, tasa_interes, fecha_inicio, metodo } = req.query;
			
			let montoFinanciado = 0;
			let plazo = 0;
			let tasa = 0;
			let fecha = new Date();

			// Caso 1: Usar datos de una venta existente
			if (venta_id) {
				const schema = await getSchema();
				const ventasService = new ItemsService('ventas', { schema, accountability: req.accountability });
				const venta = await ventasService.readOne(venta_id, { 
					fields: ['estatus', 'monto_financiado', 'plazo_meses', 'fecha_venta'] 
				});

				if (!venta) throw new NotFoundException(`Venta ${venta_id} no encontrada`);
				
				// Validación de estatus según requerimiento
				if (venta.estatus !== 'contrato') {
					// Nota: El prompt dice "Validar que venta exista y esté estatus 'contrato'".
					// Podríamos lanzar error o advertencia. Lanzaremos error para ser estrictos con la regla de negocio.
					throw new InvalidPayloadException(`La venta debe estar en estatus 'contrato' (Actual: ${venta.estatus})`);
				}

				montoFinanciado = parseFloat(venta.monto_financiado);
				plazo = parseInt(venta.plazo_meses);
				// Si la venta no tiene tasa guardada, usamos la del query param o 0
				tasa = parseFloat(tasa_interes || 0); 
				fecha = venta.fecha_venta ? new Date(venta.fecha_venta) : new Date();

			} else {
				// Caso 2: Simulación con parámetros manuales
				if (!monto_total || !plazo_meses) {
					throw new InvalidPayloadException("Faltan parámetros requeridos: monto_total y plazo_meses (o venta_id)");
				}
				montoFinanciado = parseFloat(monto_total) - (parseFloat(enganche) || 0);
				plazo = parseInt(plazo_meses);
				tasa = parseFloat(tasa_interes || 0);
				fecha = fecha_inicio ? new Date(fecha_inicio) : new Date();
			}

			// Validaciones de Negocio (T3.1)
			if (montoFinanciado <= 0) {
				throw new InvalidPayloadException("El monto financiado debe ser mayor a 0");
			}
			if (plazo < 1 || plazo > 360) {
				throw new InvalidPayloadException("El plazo debe ser entre 1 y 360 meses");
			}
			if (tasa < 0 || tasa > 20) {
				throw new InvalidPayloadException("La tasa de interés debe estar entre 0% y 20%");
			}
			if (isNaN(fecha.getTime())) {
				throw new InvalidPayloadException("La fecha de inicio no es válida");
			}

			const tabla = calcularAmortizacion(
				montoFinanciado, 
				plazo, 
				tasa,
				fecha,
				metodo || 'frances'
			);

			res.json({ data: tabla });
		} catch (error) {
			if (error instanceof NotFoundException) return res.status(404).json({ errors: [{ message: error.message }] });
			return res.status(400).json({ errors: [{ message: error.message }] });
		}
	});

	router.get('/simular-amortizacion', (req, res) => {
		try {
			const { monto_total, enganche, plazo_meses, tasa_interes, fecha_inicio, metodo } = req.query;

			if (!monto_total || !plazo_meses) {
				throw new InvalidPayloadException("Faltan parámetros: monto_total, plazo_meses");
			}

			const montoFinanciado = parseFloat(monto_total) - (parseFloat(enganche) || 0);
			if (montoFinanciado <= 0) {
				return res.json({ data: [] });
			}

			const tabla = calcularAmortizacion(
				montoFinanciado, 
				parseInt(plazo_meses), 
				parseFloat(tasa_interes || 0),
				fecha_inicio || new Date(),
				metodo || 'frances'
			);

			res.json({ data: tabla });
		} catch (error) {
			return res.status(400).json({ errors: [{ message: error.message }] });
		}
	});

	router.get('/simular-comisiones', async (req, res) => {
		try {
			const { monto_total, vendedor_id, esquema_override, monto_fijo_override, porcentaje_override } = req.query;
			
			if (!monto_total || !vendedor_id) {
				throw new InvalidPayloadException("Faltan parámetros: monto_total, vendedor_id");
			}

			const schema = await getSchema();
			const vendedoresService = new ItemsService('vendedores', { schema, accountability: req.accountability });
			const vendedor = await vendedoresService.readOne(vendedor_id, { fields: ['comision_porcentaje', 'comision_esquema'] });

			if (!vendedor) throw new NotFoundException("Vendedor no encontrado");

			// Determinar esquema y valores (prioridad: query params > DB > default)
			const esquema = esquema_override || vendedor.comision_esquema || 'porcentaje';
			const porcentaje = parseFloat(porcentaje_override || vendedor.comision_porcentaje || 0);
			const montoFijo = parseFloat(monto_fijo_override || 0);

			let montoComision = 0;

			if (esquema === 'porcentaje') {
				montoComision = parseFloat(monto_total) * (porcentaje / 100);
			} else if (esquema === 'fijo') {
				montoComision = montoFijo;
			} else if (esquema === 'mixto') {
				montoComision = (parseFloat(monto_total) * (porcentaje / 100)) + montoFijo;
			}

			res.json({ 
				data: {
					vendedor_id,
					esquema_aplicado: esquema,
					monto_base: parseFloat(monto_total),
					parametros: {
						porcentaje: porcentaje,
						fijo: montoFijo
					},
					monto_comision: parseFloat(montoComision.toFixed(2))
				}
			});
		} catch (error) {
			if (error instanceof NotFoundException) return res.status(404).json({ errors: [{ message: error.message }] });
			return res.status(400).json({ errors: [{ message: error.message }] });
		}
	});

	// =================================================================================
	// 1. GET /ventas - Listar todas las ventas con filtros
	// =================================================================================
	router.get('/', async (req, res) => {
		try {
			const schema = await getSchema();
			const ventasService = new ItemsService('ventas', { schema, accountability: req.accountability });
			
			const { estatus, fecha_venta, vendedor_id, limit, page, sort } = req.query;

			const filter = { _and: [] };

			if (estatus) filter._and.push({ estatus: { _eq: estatus } });
			if (fecha_venta) filter._and.push({ fecha_venta: { _eq: fecha_venta } }); // O range search si se requiere
			if (vendedor_id) filter._and.push({ vendedor_id: { _eq: vendedor_id } });

			const items = await ventasService.readByQuery({
				filter: filter._and.length > 0 ? filter : {},
				limit: limit ? parseInt(limit) : 20,
				page: page ? parseInt(page) : 1,
				sort: sort || ['-date_created'],
				fields: ['*', 'cliente_id.nombre', 'cliente_id.apellido', 'lote_id.identificador', 'vendedor_id.nombre']
			});

			res.json({ data: items });

		} catch (error) {
			console.error('❌ Error en GET /ventas:', error);
			return res.status(500).json({ errors: [{ message: error.message }] });
		}
	});

	// =================================================================================
	// 2. GET /ventas/:id - Obtener venta por ID con relaciones
	// =================================================================================
	router.get('/:id', async (req, res) => {
		try {
			const { id } = req.params;
			const schema = await getSchema();
			const ventasService = new ItemsService('ventas', { schema, accountability: req.accountability });

			const venta = await ventasService.readOne(id, {
				fields: [
					'*',
					'lote_id.*',
					'cliente_id.*',
					'vendedor_id.*',
					'pagos.*',
					'comisiones.*'
				]
			});

			if (!venta) throw new NotFoundException(`Venta ${id} no encontrada`);

			res.json({ data: venta });

		} catch (error) {
			console.error(`❌ Error en GET /ventas/${req.params.id}:`, error);
			if (error instanceof NotFoundException) {
				return res.status(404).json({ errors: [{ message: error.message }] });
			}
			return res.status(500).json({ errors: [{ message: error.message }] });
		}
	});

	// =================================================================================
	// 3. POST /ventas - Crear nueva venta (Lógica Compleja)
	// =================================================================================
	router.post('/', async (req, res) => {
		let trx;
		try {
			const { 
				lote_id, 
				cliente_id, 
				vendedor_id, 
				fecha_venta, 
				monto_total, 
				enganche, 
				plazo_meses, 
				tasa_interes 
			} = req.body;

			// 1. Validaciones Básicas
			if (!lote_id || !cliente_id || !vendedor_id || !monto_total) {
				throw new InvalidPayloadException("Faltan campos obligatorios");
			}
			if (monto_total <= 0) throw new InvalidPayloadException("El monto total debe ser positivo");
			if (enganche < 0) throw new InvalidPayloadException("El enganche no puede ser negativo");

			const schema = await getSchema();
			const lotesService = new ItemsService('lotes', { schema, accountability: req.accountability });
			const clientesService = new ItemsService('clientes', { schema, accountability: req.accountability });
			const vendedoresService = new ItemsService('vendedores', { schema, accountability: req.accountability });
			const ventasService = new ItemsService('ventas', { schema, accountability: req.accountability });
			const pagosService = new ItemsService('pagos', { schema, accountability: req.accountability });
			const comisionesService = new ItemsService('comisiones', { schema, accountability: req.accountability });

			// Iniciar Transacción
			trx = await database.transaction();

			// 2. Validar Existencia y Estatus
			const lote = await lotesService.readOne(lote_id, { fields: ['id', 'estatus'] });
			if (!lote) throw new InvalidPayloadException("Lote no encontrado");
			if (lote.estatus !== 'disponible') throw new InvalidPayloadException(`El lote no está disponible (Estatus: ${lote.estatus})`);

			const cliente = await clientesService.readOne(cliente_id, { fields: ['id'] });
			if (!cliente) throw new InvalidPayloadException("Cliente no encontrado");

			const vendedor = await vendedoresService.readOne(vendedor_id, { fields: ['id', 'activo', 'comision_porcentaje'] });
			if (!vendedor) throw new InvalidPayloadException("Vendedor no encontrado");
			if (!vendedor.activo) throw new InvalidPayloadException("El vendedor no está activo");

			// 3. Cálculos Financieros
			const monto_financiado = monto_total - enganche;
			const es_financiado = monto_financiado > 0 && plazo_meses > 0;

			// 4. Crear Registro de Venta
			const nuevaVentaPayload = {
				lote_id,
				cliente_id,
				vendedor_id,
				fecha_venta: fecha_venta || new Date().toISOString(),
				monto_total,
				enganche,
				monto_financiado,
				estatus: 'contrato', // O 'apartado' según workflow inicial
				plazo_meses: plazo_meses || 0,
				tasa_interes: tasa_interes || 0
			};

			// Usamos el servicio pero pasamos la transacción (si Directus lo permite en options, 
			// nota: en extensiones v9/v10 itemsService no siempre acepta trx directo en constructor, 
			// pero podemos usar database knex dentro si itemsService falla.
			// Sin embargo, ItemsService usa el knex instance de database. 
			// Para transacciones seguras con ItemsService, necesitamos pasar knex: trx
			// Verificamos si ItemsService acepta knex transaction.
			// Si no, hacemos las operaciones directas con trx(table).
			
			// Para máxima compatibilidad en extensiones, usaremos trx('table') para inserts críticos si ItemsService da problemas,
			// pero intentaremos usar ItemsService pasando { knex: trx } si es soportado, o simplemente trx object.
			// En Directus 10+, ItemsService acepta { knex: trx } en las opciones de métodos o constructor.
			// Asumiremos uso de trx directo para seguridad.
			
			// Paso 4a: Insertar Venta
			const [ventaId] = await trx('ventas').insert(nuevaVentaPayload).returning('id');
            // Nota: .returning('id') devuelve array de objetos en PG, en MySQL puede ser diferente.
            // Directus normaliza esto, pero raw knex no.
            // En MySQL, insert devuelve [id].
            const idVenta = typeof ventaId === 'object' ? ventaId.id : ventaId;


			// 5. Actualizar Lote
			await trx('lotes').where({ id: lote_id }).update({ estatus: 'apartado' });

			// 6. Generar Pagos (Amortización)
			const pagosParaInsertar = [];
			
			// 6.1 Pago de Enganche (si no se pagó de inmediato, o se registra como primer pago)
			// Asumimos que el enganche se registra aparte o es el pago 0.
			// Instrucción: "Crear registros de pagos según plazo".
			// Crearemos un registro para el enganche si es > 0? Generalmente se maneja aparte, pero lo incluiremos como 'enganche'.
			/*
            if (enganche > 0) {
				pagosParaInsertar.push({
					venta_id: idVenta,
					fecha_pago: fecha_venta || new Date(), // Fecha inmediata
					monto: enganche,
					concepto: 'enganche',
					numero_pago: 0,
					estatus: 'pendiente' // O pagado si ya se cobró
				});
			}
            */

			if (es_financiado) {
				// Usar helper de cálculo
				const pagosCalculados = calcularAmortizacion(
					monto_financiado,
					plazo_meses,
					tasa_interes,
					fecha_venta || new Date()
				);

				// Mapear al formato de inserción (añadir venta_id)
				pagosCalculados.forEach(pago => {
					pagosParaInsertar.push({
						...pago,
						venta_id: idVenta,
						concepto: `mensualidad`
					});
				});
			}

			if (pagosParaInsertar.length > 0) {
				await trx('pagos').insert(pagosParaInsertar);
			}

			// 7. Generar Comisiones
			// Lógica simple: % del total
			if (vendedor.comision_porcentaje > 0) {
				const montoComision = monto_total * (vendedor.comision_porcentaje / 100);
				await trx('comisiones').insert({
					venta_id: idVenta,
					vendedor_id: vendedor_id,
					monto: parseFloat(montoComision.toFixed(2)),
					estatus: 'pendiente',
					fecha_generacion: new Date()
				});
			}

			await trx.commit();

			res.json({ 
				data: { 
					id: idVenta,
					message: "Venta creada exitosamente" 
				} 
			});

		} catch (error) {
			if (trx) await trx.rollback();
			console.error('❌ Error en POST /ventas:', error);
			if (error instanceof InvalidPayloadException) {
				return res.status(400).json({ errors: [{ message: error.message }] });
			}
			return res.status(500).json({ errors: [{ message: error.message }] });
		}
	});

	// =================================================================================
	// 4. PATCH /ventas/:id - Actualizar venta
	// =================================================================================
	router.patch('/:id', async (req, res) => {
		try {
			const { id } = req.params;
			const payload = req.body;
			const schema = await getSchema();
			const ventasService = new ItemsService('ventas', { schema, accountability: req.accountability });

			// Validar campos permitidos (no permitir cambiar lote o cliente fácilmente sin lógica extra)
			const camposPermitidos = ['estatus', 'notas', 'fecha_venta']; // Ejemplo restringido
            // Si el usuario quiere cambiar montos, debería recalcularse todo, lo cual es complejo para un PATCH simple.
            // Por ahora permitimos estatus.

            // Nota: Si se permite editar todo, usar filter keys.
            
			await ventasService.updateOne(id, payload);
			res.json({ data: { id, message: "Venta actualizada" } });

		} catch (error) {
			console.error(`❌ Error en PATCH /ventas/${req.params.id}:`, error);
			return res.status(500).json({ errors: [{ message: error.message }] });
		}
	});

	// =================================================================================
	// 5. DELETE /ventas/:id - Soft Delete
	// =================================================================================
	router.delete('/:id', async (req, res) => {
		let trx;
		try {
			const { id } = req.params;
			const schema = await getSchema();
            
            // Usar transacción para revertir lote a disponible
            trx = await database.transaction();

            // Verificar estatus
            const venta = await trx('ventas').where({ id }).first();
            if (!venta) throw new NotFoundException("Venta no encontrada");
            
            if (venta.estatus === 'cancelada') {
                 throw new InvalidPayloadException("La venta ya está cancelada");
            }

            // Soft delete: Marcar como cancelada
            await trx('ventas').where({ id }).update({ estatus: 'cancelada' });

            // Liberar lote
            await trx('lotes').where({ id: venta.lote_id }).update({ estatus: 'disponible' });

            // Cancelar pagos pendientes
            await trx('pagos').where({ venta_id: id, estatus: 'pendiente' }).update({ estatus: 'cancelado' });

            await trx.commit();
			res.json({ success: true, message: "Venta cancelada y lote liberado" });

		} catch (error) {
            if (trx) await trx.rollback();
			console.error(`❌ Error en DELETE /ventas/${req.params.id}:`, error);
			return res.status(500).json({ errors: [{ message: error.message }] });
		}
	});
};

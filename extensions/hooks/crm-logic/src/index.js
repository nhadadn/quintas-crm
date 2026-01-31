export default ({ filter, action }, { services, exceptions, database, getSchema }) => {
	const { ItemsService } = services;
	const { ServiceUnavailableException, ForbiddenException, InvalidPayloadException } = exceptions;

	// =================================================================================
	// 1. HOOK: lote.items.create
	// DESCRIPCIÓN: Validar que lote esté disponible antes de crear (o asignar)
	// NOTA: Si se refiere a asignar un lote en una VENTA, esto se cubre en venta.create.
	// Si se refiere a crear un LOTE nuevo, aseguramos que nazca 'disponible'.
	// =================================================================================
	filter('lotes.items.create', async (payload) => {
		// Asegurar que un nuevo lote nazca disponible por defecto si no se especifica
		if (!payload.estatus) {
			payload.estatus = 'disponible';
		}
		return payload;
	});

	// =================================================================================
	// 2. HOOK: ventas.items.create (FILTER)
	// DESCRIPCIÓN: Validar que lote esté disponible antes de crear la venta
	// =================================================================================
	filter('ventas.items.create', async (payload) => {
		if (payload.lote_id) {
			try {
				// Usamos knex para velocidad y evitar overhead de ItemsService en el filtro
				const result = await database.select('estatus').from('lotes').where('id', payload.lote_id).first();
				
				if (!result) {
					throw new InvalidPayloadException(`El lote con ID ${payload.lote_id} no existe.`);
				}
				
				if (result.estatus !== 'disponible') {
					throw new ForbiddenException(`El lote no está disponible para venta (Estatus actual: ${result.estatus}).`);
				}
			} catch (err) {
				// Relanzar excepciones conocidas
				if (err instanceof ForbiddenException || err instanceof InvalidPayloadException) throw err;
				// Log y error genérico para otros
				console.error('[Hook Error] Validación Lote:', err);
				throw new ServiceUnavailableException(err.message);
			}
		}
		return payload;
	});

	// =================================================================================
	// 3. HOOK: ventas.items.create (ACTION)
	// DESCRIPCIÓN: Logica post-venta (Actualizar Lote, Amortización, Comisiones)
	// =================================================================================
	action('ventas.items.create', async (meta, { schema, accountability }) => {
		const ventaId = meta.key;
		
		// Contexto de ejecución (system/admin si no hay accountability, o el usuario actual)
		const context = { schema, accountability: accountability || { role: null } };
		
		const ventasService = new ItemsService('ventas', context);
		const lotesService = new ItemsService('lotes', context);
		
		try {
			// Obtener la venta completa
			const venta = await ventasService.readOne(ventaId);
			console.log(`[Hook] Procesando nueva venta: ${ventaId}`);

			// A. Actualizar Estatus de Lote
			if (venta.lote_id) {
				await lotesService.updateOne(venta.lote_id, {
					estatus: 'apartado',
					cliente_id: venta.cliente_id,
					vendedor_id: venta.vendedor_id
				});
				console.log(`✅ Lote ${venta.lote_id} marcado como 'apartado'`);
			}

			// B. Generar Tabla de Amortización (si es financiado)
			if (venta.tipo_venta === 'financiado') {
				await generarTablaAmortizacion(venta, services, schema);
			}

			// C. Generar Comisiones
			await generarComisiones(venta, services, schema);

		} catch (error) {
			console.error(`❌ Error en post-procesamiento de venta ${ventaId}:`, error);
			// Lanzar error aquí revertirá la transacción de creación de venta (en Directus 10+)
			throw new ServiceUnavailableException(`Error procesando venta: ${error.message}`);
		}
	});

	// =================================================================================
	// 4. HOOK: pagos.items.create (ACTION)
	// DESCRIPCIÓN: Actualizar venta y calcular mora
	// =================================================================================
	action('pagos.items.create', async (meta, { schema, accountability }) => {
		const pagoId = meta.key;
		const context = { schema, accountability: accountability || { role: null } };
		const pagosService = new ItemsService('pagos', context);
		const ventasService = new ItemsService('ventas', context);

		try {
			const pago = await pagosService.readOne(pagoId);
			
			if (!pago.venta_id) return; // Pago suelto? Ignorar

			console.log(`[Hook] Procesando pago ${pagoId} para venta ${pago.venta_id}`);

			// A. Calcular Mora (Si aplica y no se ha calculado ya)
			// Si la fecha de pago real es mayor a la programada
			const fechaPago = new Date(); // Fecha actual de registro
			const fechaProgramada = new Date(pago.fecha_programada);
			
			// Si pagó después de la fecha programada (y no tenía ya mora)
			if (fechaPago > fechaProgramada && (!pago.mora || pago.mora == 0)) {
				// Lógica simple de mora: 5% del monto si se pasa
				// Ojo: Esto debería ser un filtro antes de guardar para modificar el payload,
				// pero aquí ya se guardó. Hacemos update.
				const diasRetraso = Math.ceil((fechaPago - fechaProgramada) / (1000 * 60 * 60 * 24));
				
				// Solo aplicar si hay retraso real (ej. > 0 dias)
				if (diasRetraso > 0) {
					const montoMora = parseFloat(pago.monto) * 0.05; // 5% fijo por ahora
					
					await pagosService.updateOne(pagoId, {
						mora: montoMora,
						notas: (pago.notas || '') + `\n[Auto] Mora generada por ${diasRetraso} días de retraso.`
					});
					console.log(`⚠️ Mora de ${montoMora} aplicada al pago ${pagoId}`);
				}
			}

			// B. Actualizar Estatus de Venta (Si se liquidó todo)
			// Obtener todos los pagos de esta venta
			const pagosVenta = await pagosService.readByQuery({
				filter: { venta_id: { _eq: pago.venta_id } },
				fields: ['monto', 'estatus', 'mora']
			});

			// Calcular total pagado vs total venta
			const venta = await ventasService.readOne(pago.venta_id);
			const totalVenta = parseFloat(venta.monto_total);
			
			const totalPagado = pagosVenta.reduce((acc, p) => {
				if (p.estatus === 'pagado') {
					return acc + parseFloat(p.monto) + parseFloat(p.mora || 0);
				}
				return acc;
			}, 0);

			// Si el saldo es <= 0 (o margen de error pequeño)
			// Nota: hay que restar el enganche si no es parte de la tabla de pagos?
			// Asumimos que "pagos" incluye todo o la logica de saldo es: Total - Pagado
			
			// Verificamos si quedan pagos pendientes
			const pagosPendientes = pagosVenta.filter(p => p.estatus !== 'pagado');
			
			if (pagosPendientes.length === 0 && totalPagado >= (totalVenta - parseFloat(venta.enganche || 0))) {
				// Si no hay pagos pendientes y se cubrió el monto (menos enganche que se paga al inicio)
				// Ojo: Si el enganche se registra como un "pago" también, entonces totalPagado >= totalVenta.
				// Asumiremos que el enganche NO está en la tabla pagos generada automáticamente, pero si el usuario registra el pago del enganche...
				// Para seguridad: Si no hay pagos pendientes (estatus != pagado), la venta está pagada.
				
				if (venta.estatus !== 'pagada') {
					await ventasService.updateOne(pago.venta_id, { estatus: 'pagada' });
					console.log(`🎉 Venta ${pago.venta_id} LIQUIDADA completada!`);
					
					// Actualizar Lote a 'vendido' permanentemente?
					if (venta.lote_id) {
						await lotesService.updateOne(venta.lote_id, { estatus: 'vendido' });
					}
				}
			}

		} catch (error) {
			console.error(`❌ Error procesando pago ${pagoId}:`, error);
		}
	});
};

// --- Funciones Auxiliares ---

async function generarTablaAmortizacion(venta, services, schema) {
	const { ItemsService } = services;
	const pagosService = new ItemsService('pagos', { schema });
	
	const principal = parseFloat(venta.monto_total) - parseFloat(venta.enganche || 0);
	const months = parseInt(venta.plazo_meses || 12);
	const rate = parseFloat(venta.tasa_interes || 0) / 100 / 12; // Tasa mensual
	const startDate = new Date(venta.fecha_inicio || Date.now());
	
	let monthlyPayment = 0;
	if (rate <= 0) {
		monthlyPayment = principal / months;
	} else {
		// Fórmula anualidades vencidas: R = P * [i * (1+i)^n] / [(1+i)^n - 1]
		monthlyPayment = principal * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
	}
	
	console.log(`🧮 Generando amortización: Principal=${principal}, Meses=${months}, Cuota=${monthlyPayment.toFixed(2)}`);
	
	const pagos = [];
	let balance = principal;
	
	for (let i = 1; i <= months; i++) {
		const interest = balance * (rate > 0 ? rate : 0);
		let capital = monthlyPayment - interest;
		
		// Ajuste último pago
		if (i === months) {
			capital = balance;
			// Recalcular cuota final exacta
			// monthlyPayment = capital + interest; 
		}

		balance -= capital;
		
		const payDate = new Date(startDate);
		payDate.setMonth(startDate.getMonth() + i);
		
		pagos.push({
			venta_id: venta.id,
			numero_pago: i,
			monto: (capital + interest).toFixed(2), // Guardamos la cuota total
			fecha_programada: payDate.toISOString().split('T')[0],
			estatus: 'pendiente',
			interes: interest.toFixed(2),
			capital: capital.toFixed(2),
			saldo_restante: (balance < 0.01 ? 0 : balance).toFixed(2),
			notas: 'Generado automáticamente'
		});
	}
	
	await pagosService.createMany(pagos);
	console.log(`✅ ${months} pagos generados para Venta ${venta.id}`);
}

async function generarComisiones(venta, services, schema) {
	const { ItemsService } = services;
	const comisionesService = new ItemsService('comisiones', { schema });
	const vendedoresService = new ItemsService('vendedores', { schema });
	
	let commissionRate = 5.0; // Default
	
	try {
		const vendedor = await vendedoresService.readOne(venta.vendedor_id);
		if (vendedor && vendedor.porcentaje_comision) {
			commissionRate = parseFloat(vendedor.porcentaje_comision);
		}
	} catch (e) {
		console.warn('⚠️ No se pudo obtener comisión del vendedor, usando default 5%');
	}
	
	const totalCommission = parseFloat(venta.monto_total) * (commissionRate / 100);
	
	const milestones = [
		{ name: 'Enganche', pct: 0.30, condition: 'Al pagar enganche' },
		{ name: 'Contrato', pct: 0.30, condition: 'Al firmar contrato' },
		{ name: 'Liquidación', pct: 0.40, condition: 'Al liquidar venta' }
	];
	
	const comisiones = milestones.map(m => ({
		venta_id: venta.id,
		vendedor_id: venta.vendedor_id,
		monto: (totalCommission * m.pct).toFixed(2),
		concepto: `Comisión ${m.name} (${(m.pct * 100).toFixed(0)}%)`,
		estatus: 'pendiente',
		fecha_generacion: new Date().toISOString().split('T')[0]
	}));
	
	await comisionesService.createMany(comisiones);
	console.log(`💰 ${comisiones.length} comisiones generadas para Vendedor ${venta.vendedor_id}`);
}

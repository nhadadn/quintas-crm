export default (router, { services, exceptions, getSchema }) => {
	const { ItemsService } = services;
	const { InvalidPayloadException, NotFoundException } = exceptions;

	console.log('✅ Endpoint /comisiones registrado correctamente');

	router.get('/calcular', async (req, res) => {
		try {
			const { venta_id } = req.query;

			if (!venta_id) {
				throw new InvalidPayloadException("Falta parámetro requerido: venta_id");
			}

			const schema = await getSchema();
			const ventasService = new ItemsService('ventas', { schema, accountability: req.accountability });
			const vendedoresService = new ItemsService('vendedores', { schema, accountability: req.accountability });

			// 1. Obtener Venta
			const venta = await ventasService.readOne(venta_id, {
				fields: ['id', 'monto_total', 'vendedor_id', 'fecha_venta']
			});

			if (!venta) throw new NotFoundException(`Venta ${venta_id} no encontrada`);
			if (!venta.vendedor_id) throw new InvalidPayloadException(`La venta ${venta_id} no tiene vendedor asignado`);

			// 2. Obtener Vendedor y su Esquema
			const vendedor = await vendedoresService.readOne(venta.vendedor_id, {
				fields: ['id', 'nombre', 'apellido_paterno', 'comision_esquema', 'comision_porcentaje', 'comision_fija']
			});

			if (!vendedor) throw new NotFoundException(`Vendedor ${venta.vendedor_id} no encontrado`);

			// 3. Calcular Comisión Total
			const esquema = vendedor.comision_esquema || 'porcentaje';
			const porcentaje = parseFloat(vendedor.comision_porcentaje || 0);
			const fijo = parseFloat(vendedor.comision_fija || 0); // Asumimos campo comision_fija
			const montoVenta = parseFloat(venta.monto_total || 0);

			let comisionTotal = 0;

			if (esquema === 'fijo') {
				comisionTotal = fijo;
			} else if (esquema === 'porcentaje') {
				comisionTotal = montoVenta * (porcentaje / 100);
			} else if (esquema === 'mixto') {
				comisionTotal = (montoVenta * (porcentaje / 100)) + fijo;
			}

			// 4. Dividir Comisión (Regla de Negocio: 30% Enganche, 30% Contrato, 40% Liquidación)
			const split = {
				enganche: 0.30,
				contrato: 0.30,
				liquidacion: 0.40
			};

			const comisiones = [
				{
					tipo_comision: 'enganche',
					porcentaje_split: 30,
					monto: parseFloat((comisionTotal * split.enganche).toFixed(2)),
					estatus: 'pendiente',
					fecha_pago_programada: null // Se definiría al confirmar el enganche
				},
				{
					tipo_comision: 'contrato',
					porcentaje_split: 30,
					monto: parseFloat((comisionTotal * split.contrato).toFixed(2)),
					estatus: 'pendiente',
					fecha_pago_programada: null // Se definiría al firmar contrato
				},
				{
					tipo_comision: 'liquidacion',
					porcentaje_split: 40,
					monto: parseFloat((comisionTotal * split.liquidacion).toFixed(2)),
					estatus: 'pendiente',
					fecha_pago_programada: null // Se definiría al liquidar
				}
			];

			// Ajuste de centavos en el último pago (liquidación)
			const sumaCalculada = comisiones.reduce((acc, c) => acc + c.monto, 0);
			const diferencia = parseFloat((comisionTotal - sumaCalculada).toFixed(2));
			
			if (diferencia !== 0) {
				comisiones[2].monto = parseFloat((comisiones[2].monto + diferencia).toFixed(2));
			}

			res.json({
				data: comisiones,
				meta: {
					venta_id: venta.id,
					vendedor: {
						id: vendedor.id,
						nombre: `${vendedor.nombre} ${vendedor.apellido_paterno || ''}`.trim(),
						esquema: esquema
					},
					calculo: {
						monto_venta: montoVenta,
						base_calculo: {
							porcentaje: porcentaje,
							fijo: fijo
						},
						comision_total: parseFloat(comisionTotal.toFixed(2))
					}
				}
			});

		} catch (error) {
			console.error('❌ Error en /comisiones/calcular:', error);
			if (error instanceof NotFoundException) return res.status(404).json({ errors: [{ message: error.message }] });
			if (error instanceof InvalidPayloadException) return res.status(400).json({ errors: [{ message: error.message }] });
			return res.status(500).json({ errors: [{ message: error.message }] });
		}
	});
};

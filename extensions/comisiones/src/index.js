      export default (router, { services, getSchema }) => {
  const { ItemsService } = services;
  const InvalidPayloadException = class extends Error { constructor(msg) { super(msg); this.status = 400; } };
  const NotFoundException = class extends Error { constructor(msg) { super(msg); this.status = 404; } };

  console.log('✅ Endpoint /comisiones registrado correctamente');

  router.get('/calcular', async (req, res) => {
    try {
      const { venta_id } = req.query;

      if (!venta_id) {
        throw new InvalidPayloadException('Falta parámetro requerido: venta_id');
      }

      const schema = await getSchema();
      const ventasService = new ItemsService('ventas', {
        schema,
        accountability: req.accountability,
      });
      const vendedoresService = new ItemsService('vendedores', {
        schema,
        accountability: req.accountability,
      });

      // 1. Obtener Venta
      const venta = await ventasService.readOne(venta_id, {
        fields: ['id', 'monto_total', 'vendedor_id', 'fecha_venta'],
      });

      if (!venta) throw new NotFoundException(`Venta ${venta_id} no encontrada`);
      if (!venta.vendedor_id)
        throw new InvalidPayloadException(`La venta ${venta_id} no tiene vendedor asignado`);

      // 2. Obtener Vendedor
      const vendedor = await vendedoresService.readOne(venta.vendedor_id, {
        fields: [
          'id',
          'nombre',
          'apellido_paterno',
          'comision_porcentaje',
        ],
      });

      if (!vendedor) throw new NotFoundException(`Vendedor ${venta.vendedor_id} no encontrado`);

      // 3. Calcular Comisión Total
      const porcentaje = parseFloat(vendedor.comision_porcentaje || 5.0);
      const montoVenta = parseFloat(venta.monto_total || 0);

      const comisionTotal = (montoVenta * porcentaje) / 100;

      res.json({
        data: {
          venta_id,
          vendedor_id: vendedor.id,
          esquema: 'porcentaje',
          comision_total: comisionTotal,
          detalles: {
            monto_venta: montoVenta,
            porcentaje_aplicado: porcentaje
          }
        }
      });

    } catch (error) {
      console.error('❌ Error en GET /comisiones/calcular:', error);
      // Return JSON error response instead of throwing to avoid 500 HTML
      return res.status(error.status || 500).json({ 
        errors: [{ message: error.message, code: error.code || 'INTERNAL_SERVER_ERROR' }] 
      });
    }
  });
};

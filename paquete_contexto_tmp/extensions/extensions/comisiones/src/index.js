export default (router, { services, database, getSchema }) => {
  const { ItemsService, UsersService } = services;
  const InvalidPayloadException = class extends Error {
    constructor(msg) {
      super(msg);
      this.status = 400;
    }
  };
  const NotFoundException = class extends Error {
    constructor(msg) {
      super(msg);
      this.status = 404;
    }
  };
  const ForbiddenException = class extends Error {
    constructor(msg) {
      super(msg);
      this.status = 403;
    }
  };

  console.log('✅ Endpoint /comisiones registrado correctamente');

  // Helper to get Vendedor ID from User ID
  async function getVendedorIdFromUser(userId, schema) {
    if (!userId) return null;

    // 1. Get User Email
    const usersService = new UsersService({ schema, accountability: { admin: true } });
    const user = await usersService.readOne(userId, { fields: ['email'] });
    if (!user || !user.email) return null;

    // 2. Find Vendedor by Email
    // We use admin accountability to find the vendedor record
    const vendedoresService = new ItemsService('vendedores', {
      schema,
      accountability: { admin: true },
    });
    const vendedores = await vendedoresService.readByQuery({
      filter: { email: { _eq: user.email } },
      limit: 1,
      fields: ['id'],
    });

    if (vendedores && vendedores.length > 0) {
      return vendedores[0].id;
    }
    return null;
  }

  // GET /calcular (Existing Logic)
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
        fields: ['id', 'nombre', 'apellido_paterno', 'comision_porcentaje'],
      });

      if (!vendedor) throw new NotFoundException(`Vendedor ${venta.vendedor_id} no encontrado`);

      // 3. Calcular Comisión Total y Desglose
      const porcentaje = parseFloat(vendedor.comision_porcentaje || 5.0);
      const montoVenta = parseFloat(venta.monto_total || 0);
      const comisionTotal = (montoVenta * porcentaje) / 100;

      // Definición de Hitos (Milestones) - Debe coincidir con la lógica de Hooks
      const milestones = [
        { name: 'Enganche', pct: 0.3, condition: 'Al pagar enganche' },
        { name: 'Contrato', pct: 0.3, condition: 'Al firmar contrato' },
        { name: 'Liquidación', pct: 0.4, condition: 'Al liquidar venta' },
      ];

      const desglose = milestones.map((m) => ({
        concepto: m.name,
        condicion: m.condition,
        porcentaje_del_total: (m.pct * 100).toFixed(0) + '%',
        monto_estimado: (comisionTotal * m.pct).toFixed(2),
      }));

      res.json({
        data: {
          venta_id,
          vendedor_id: vendedor.id,
          esquema: 'porcentaje_hitos',
          comision_total: comisionTotal,
          detalles: {
            monto_venta: montoVenta,
            porcentaje_aplicado: porcentaje,
            desglose_hitos: desglose,
          },
        },
      });
    } catch (error) {
      console.error('❌ Error en GET /comisiones/calcular:', error);
      return res.status(error.status || 500).json({
        errors: [{ message: error.message, code: error.code || 'INTERNAL_SERVER_ERROR' }],
      });
    }
  });

  // GET /mis-comisiones
  router.get('/mis-comisiones', async (req, res) => {
    try {
      const schema = await getSchema();
      const vendedorId = await getVendedorIdFromUser(req.accountability.user, schema);

      if (!vendedorId) {
        throw new ForbiddenException('No se encontró un perfil de vendedor asociado a tu usuario.');
      }

      const comisionesService = new ItemsService('comisiones', {
        schema,
        accountability: req.accountability,
      });
      const comisiones = await comisionesService.readByQuery({
        filter: { vendedor_id: { _eq: vendedorId } },
        sort: ['-created_at'],
        ...req.query, // Allow pagination/filtering
      });

      res.json({ data: comisiones });
    } catch (error) {
      return res.status(error.status || 500).json({ errors: [{ message: error.message }] });
    }
  });

  // GET /mis-comisiones/resumen
  router.get('/mis-comisiones/resumen', async (req, res) => {
    try {
      const schema = await getSchema();
      const vendedorId = await getVendedorIdFromUser(req.accountability.user, schema);

      if (!vendedorId) {
        throw new ForbiddenException('No se encontró un perfil de vendedor asociado a tu usuario.');
      }

      // Use database for aggregation as ItemsService aggregation is sometimes tricky with custom permissions
      // But better to use ItemsService if possible. Let's use direct database for aggregation efficiency if allowed,
      // OR use ItemsService.readByQuery with aggregate.
      // Since we have 'database' available:

      const resumen = await database('comisiones')
        .where('vendedor_id', vendedorId)
        .select('estatus')
        .sum('monto_comision as total')
        .count('id as cantidad')
        .groupBy('estatus');

      const stats = {
        pendiente: { total: 0, cantidad: 0 },
        aprobada: { total: 0, cantidad: 0 },
        pagada: { total: 0, cantidad: 0 },
        cancelada: { total: 0, cantidad: 0 },
        total_acumulado: 0,
      };

      resumen.forEach((row) => {
        if (stats[row.estatus]) {
          stats[row.estatus].total = parseFloat(row.total || 0);
          stats[row.estatus].cantidad = parseInt(row.cantidad || 0);
          if (row.estatus !== 'cancelada') {
            stats.total_acumulado += stats[row.estatus].total;
          }
        }
      });

      res.json({ data: stats });
    } catch (error) {
      console.error(error);
      return res.status(error.status || 500).json({ errors: [{ message: error.message }] });
    }
  });

  // PUT /:id/aprobar (Admin only)
  router.put('/:id/aprobar', async (req, res) => {
    try {
      if (!req.accountability || !req.accountability.admin) {
        throw new ForbiddenException('Solo administradores pueden aprobar comisiones.');
      }

      const { id } = req.params;
      const schema = await getSchema();
      const comisionesService = new ItemsService('comisiones', {
        schema,
        accountability: req.accountability,
      });

      const comision = await comisionesService.readOne(id);
      if (!comision) throw new NotFoundException('Comisión no encontrada');

      if (comision.estatus === 'cancelada') {
        throw new InvalidPayloadException('No se puede aprobar una comisión cancelada.');
      }

      await comisionesService.updateOne(id, {
        estatus: 'aprobada',
        fecha_aprobacion: new Date(),
        aprobado_por: req.accountability.user,
      });

      res.json({ success: true, message: 'Comisión aprobada' });
    } catch (error) {
      return res.status(error.status || 500).json({ errors: [{ message: error.message }] });
    }
  });

  // PUT /:id/pagar (Admin only)
  router.put('/:id/pagar', async (req, res) => {
    try {
      if (!req.accountability || !req.accountability.admin) {
        throw new ForbiddenException('Solo administradores pueden marcar comisiones como pagadas.');
      }

      const { id } = req.params;
      const schema = await getSchema();
      const comisionesService = new ItemsService('comisiones', {
        schema,
        accountability: req.accountability,
      });

      const comision = await comisionesService.readOne(id);
      if (!comision) throw new NotFoundException('Comisión no encontrada');

      if (comision.estatus !== 'aprobada') {
        throw new InvalidPayloadException('La comisión debe estar aprobada para poder pagarse.');
      }

      await comisionesService.updateOne(id, {
        estatus: 'pagada',
        fecha_pago: new Date(),
      });

      res.json({ success: true, message: 'Comisión pagada' });
    } catch (error) {
      return res.status(error.status || 500).json({ errors: [{ message: error.message }] });
    }
  });

  // PUT /:id/cancelar (Admin only)
  router.put('/:id/cancelar', async (req, res) => {
    try {
      if (!req.accountability || !req.accountability.admin) {
        throw new ForbiddenException('Solo administradores pueden cancelar comisiones.');
      }

      const { id } = req.params;
      const schema = await getSchema();
      const comisionesService = new ItemsService('comisiones', {
        schema,
        accountability: req.accountability,
      });

      const comision = await comisionesService.readOne(id);
      if (!comision) throw new NotFoundException('Comisión no encontrada');

      if (comision.estatus === 'pagada') {
        throw new InvalidPayloadException('No se puede cancelar una comisión ya pagada.');
      }

      await comisionesService.updateOne(id, {
        estatus: 'cancelada',
      });

      res.json({ success: true, message: 'Comisión cancelada' });
    } catch (error) {
      return res.status(error.status || 500).json({ errors: [{ message: error.message }] });
    }
  });
};

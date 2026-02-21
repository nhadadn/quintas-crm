export default ({ init }, { services, database, getSchema }) => {
  init('middlewares.before', async function ({ app }) {
    console.log('✅ File-based hook: /ventas health + reproceso registrado');
    const { ItemsService } = services;

    app.get('/ventas/health', (req, res) => {
      res.json({ data: { status: 'ok' } });
    });

    app.post('/ventas/reprocesar/:ventaId', async (req, res) => {
      try {
        if (!req.accountability || (!req.accountability.admin && !req.accountability.role)) {
          return res.status(401).json({ errors: [{ message: 'No autenticado' }] });
        }
        if (req.accountability && req.accountability.admin !== true) {
          const allowed = (process.env.VENTAS_WRITE_ROLES || '').split(',').map(s => s.trim()).filter(Boolean);
          if (!allowed.includes(String(req.accountability.role || ''))) {
            return res.status(403).json({ errors: [{ message: 'No autorizado' }] });
          }
        }

        const ventaId = req.params.ventaId;
        const trx = await database.transaction();
        const schema = await getSchema();
        const sys = { schema, knex: trx, accountability: { admin: true } };
        const ventasService = new ItemsService('ventas', sys);
        const vendedoresService = new ItemsService('vendedores', sys);
        const comisionesService = new ItemsService('comisiones', sys);

        const venta = await ventasService.readOne(ventaId);
        if (!venta) {
          await trx.rollback();
          return res.status(404).json({ errors: [{ message: 'Venta no encontrada' }] });
        }

        let vendedor_id = venta.vendedor_id || null;
        if (!vendedor_id) {
          try {
            const vs = await vendedoresService.readByQuery({ limit: 1 });
            if (vs && vs.length > 0) vendedor_id = vs[0].id;
          } catch {}
        }

        async function detectComisionesColumns(db) {
          try {
            if (db?.raw) {
              const res = await db.raw('SHOW COLUMNS FROM `comisiones`');
              const rows = Array.isArray(res) ? (Array.isArray(res[0]) ? res[0] : res) : res?.[0] || [];
              const names = rows.map((r) => (r.Field || r.COLUMN_NAME || '').toLowerCase());
              return { hasPorcentaje: names.includes('porcentaje'), hasPorcentajeComision: names.includes('porcentaje_comision') };
            }
          } catch {}
          return { hasPorcentaje: false, hasPorcentajeComision: true };
        }
        const cols = await detectComisionesColumns(database);

        let commissionRate = 5.0;
        let esquema = 'porcentaje';
        let comisionFija = 0.0;
        if (vendedor_id) {
          try {
            const vendedor = await vendedoresService.readOne(vendedor_id);
            if (vendedor?.comision_porcentaje != null) commissionRate = parseFloat(vendedor.comision_porcentaje);
            if (vendedor?.comision_esquema) esquema = String(vendedor.comision_esquema).toLowerCase();
            if (vendedor?.comision_fija != null) comisionFija = parseFloat(vendedor.comision_fija);
          } catch {}
        }

        const milestones = [
          { name: 'Enganche', pct: 0.3 },
          { name: 'Contrato', pct: 0.3 },
          { name: 'Liquidación', pct: 0.4 },
        ];

        const comisionesPayload = [];
        const montoVenta = parseFloat(venta.monto_total || 0);

        if (esquema === 'fijo') {
          const base = {
            venta_id: venta.id,
            vendedor_id,
            tipo_comision: 'Comisión Fija',
            monto_venta: montoVenta,
            monto_comision: parseFloat(comisionFija.toFixed(2)),
            estatus: 'pendiente',
            fecha_pago_programada: new Date().toISOString().split('T')[0],
            notas: 'Reprocesado: esquema fijo',
          };
          if (cols.hasPorcentajeComision) base.porcentaje_comision = 0.0;
          if (cols.hasPorcentaje) base.porcentaje = 0.0;
          comisionesPayload.push(base);
        } else {
          for (const m of milestones) {
            const effectiveRate = commissionRate * m.pct;
            const amount = montoVenta * (effectiveRate / 100);
            const base = {
              venta_id: venta.id,
              vendedor_id,
              tipo_comision: `Comisión ${m.name}`,
              monto_venta: montoVenta,
              monto_comision: parseFloat(amount.toFixed(2)),
              estatus: 'pendiente',
              fecha_pago_programada: new Date().toISOString().split('T')[0],
              notas: `Reprocesado. Concepto: ${m.name} (${(m.pct * 100).toFixed(0)}% del total)`,
            };
            const pr = parseFloat(effectiveRate.toFixed(2));
            if (cols.hasPorcentajeComision) base.porcentaje_comision = pr;
            if (cols.hasPorcentaje) base.porcentaje = pr;
            comisionesPayload.push(base);
          }
          if (esquema === 'mixto' && comisionFija > 0) {
            const baseFija = {
              venta_id: venta.id,
              vendedor_id,
              tipo_comision: 'Comisión Fija',
              monto_venta: montoVenta,
              monto_comision: parseFloat(comisionFija.toFixed(2)),
              estatus: 'pendiente',
              fecha_pago_programada: new Date().toISOString().split('T')[0],
              notas: 'Reprocesado: esquema mixto',
            };
            if (cols.hasPorcentajeComision) baseFija.porcentaje_comision = 0.0;
            if (cols.hasPorcentaje) baseFija.porcentaje = 0.0;
            comisionesPayload.push(baseFija);
          }
        }

        if (comisionesPayload.length === 0) {
          await trx.rollback();
          return res.status(400).json({ errors: [{ message: 'No se pudieron determinar comisiones' }] });
        }

        await trx('comisiones').where({ venta_id: venta.id }).del();
        const created = await comisionesService.createMany(comisionesPayload);
        await ventasService.updateOne(venta.id, { post_process_status: 'ok', post_process_error: null });
        await trx.commit();

        return res.status(201).json({ data: { venta_id: venta.id, comisiones: created?.length || comisionesPayload.length } });
      } catch (error) {
        console.error('❌ Error reprocesando (file-based hook):', error);
        try {
          const schema = await getSchema();
          const ventasService = new services.ItemsService('ventas', { schema, accountability: { admin: true } });
          await ventasService.updateOne(req.params.ventaId, { post_process_status: 'error', post_process_error: String(error?.message || error) });
        } catch {}
        return res.status(500).json({ errors: [{ message: error.message || String(error) }] });
      }
    });
  });
}


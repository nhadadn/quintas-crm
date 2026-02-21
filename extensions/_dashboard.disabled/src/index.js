import { exportToPDF, exportToExcel, formatCurrency } from './utils.js';

console.log('!!! ANALYTICS CUSTOM EXTENSION LOADING - START !!!');

export default (router, { services, database, getSchema }) => {
  console.log('!!! ANALYTICS CUSTOM REGISTERING ROUTES !!!');
  const { ItemsService } = services;

  // --- ENDPOINTS DASHBOARD ---
  router.get('/kpis', async (req, res) => {
    try {
      // Usamos acceso de sistema para KPIs globales (o restringir según accountability si se desea)

      const ventasService = new ItemsService('ventas', {
        schema: req.schema,
        knex: database,
        accountability: req.accountability,
      });
      const pagosService = new ItemsService('pagos', {
        schema: req.schema,
        knex: database,
        accountability: req.accountability,
      });
      const clientesService = new ItemsService('clientes', {
        schema: req.schema,
        knex: database,
        accountability: req.accountability,
      });

      // Aggregations
      const ventasAgg = await ventasService.readByQuery({
        aggregate: { sum: ['monto_total'], count: ['*'] },
        limit: -1,
      });
      const pagosAgg = await pagosService.readByQuery({
        filter: { estatus: { _eq: 'pagado' } },
        aggregate: { sum: ['monto'] },
        limit: -1,
      });
      const clientesAgg = await clientesService.readByQuery({
        aggregate: { count: ['*'] },
        limit: -1,
      });

      const totalVentas = parseFloat(ventasAgg[0]?.sum?.monto_total || 0);
      const totalCobrado = parseFloat(pagosAgg[0]?.sum?.monto || 0);
      const totalClientes = parseInt(clientesAgg[0]?.count || 0);

      res.json({
        data: {
          total_ventas: totalVentas,
          total_cobrado: totalCobrado,
          por_cobrar: totalVentas - totalCobrado,
          clientes_activos: totalClientes,
          ventas_count: parseInt(ventasAgg[0]?.count || 0),
        },
      });
    } catch (error) {
      console.error('[KPIs] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/ventas-por-mes', async (req, res) => {
    try {
      // Consulta SQL directa via Knex para agrupar por mes (MySQL syntax)
      const result = await database('ventas')
        .select(
          database.raw("DATE_FORMAT(fecha_venta, '%Y-%m') as mes"),
          database.raw('SUM(monto_total) as total')
        )
        .groupByRaw("DATE_FORMAT(fecha_venta, '%Y-%m')")
        .orderBy('mes', 'desc')
        .limit(12);

      res.json({ data: result.reverse() }); // Orden cronológico
    } catch (error) {
      console.error('[VentasMes] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/ventas-por-vendedor', async (req, res) => {
    try {
      const { formato } = req.query;
      const ventasService = new ItemsService('ventas', {
        schema: req.schema,
        knex: database,
        accountability: req.accountability,
      });
      const vendedoresService = new ItemsService('vendedores', {
        schema: req.schema,
        knex: database,
        accountability: req.accountability,
      });

      const report = await ventasService.readByQuery({
        aggregate: { sum: ['monto_total'], count: ['*'] },
        groupBy: ['vendedor_id'],
        limit: -1,
      });

      // Enriquecer con nombres de vendedores
      const enrichedData = await Promise.all(
        report.map(async (item) => {
          let vendedorName = 'Desconocido';
          if (item.vendedor_id) {
            try {
              const vendedor = await vendedoresService.readOne(item.vendedor_id, {
                fields: ['nombre', 'apellido_paterno'],
              });
              vendedorName =
                `${vendedor?.nombre || ''} ${vendedor?.apellido_paterno || ''}`.trim() ||
                'Desconocido';
            } catch (e) {
              // Ignore error if seller not found
            }
          }
          return {
            vendedor: vendedorName,
            total: parseFloat(item.sum?.monto_total || 0),
            cantidad: parseInt(item.count || 0),
          };
        })
      );

      // Sort by total desc
      enrichedData.sort((a, b) => b.total - a.total);

      if (formato === 'json' || !formato) return res.json({ data: enrichedData });

      const columns = [
        { header: 'Vendedor', key: 'vendedor' },
        { header: 'Total Ventas', key: 'total', format: formatCurrency },
        { header: 'Cantidad', key: 'cantidad' },
      ];

      if (formato === 'pdf')
        return exportToPDF(res, enrichedData, 'Reporte de Ventas por Vendedor', columns);
      if (formato === 'excel')
        return exportToExcel(res, enrichedData, 'Reporte de Ventas por Vendedor', columns);
    } catch (error) {
      console.error('[VentasVendedor] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/pagos-por-estatus', async (req, res) => {
    try {
      const { formato } = req.query;
      const pagosService = new ItemsService('pagos', {
        schema: req.schema,
        knex: database,
        accountability: req.accountability,
      });
      const report = await pagosService.readByQuery({
        aggregate: { sum: ['monto'], count: ['*'] },
        groupBy: ['estatus'],
        limit: -1,
      });

      const data = report.map((item) => ({
        estatus: item.estatus,
        total: parseFloat(item.sum?.monto || 0),
        cantidad: parseInt(item.count || 0),
      }));

      if (formato === 'json' || !formato) return res.json({ data });

      const columns = [
        { header: 'Estatus', key: 'estatus' },
        { header: 'Total', key: 'total', format: formatCurrency },
        { header: 'Cantidad', key: 'cantidad' },
      ];

      if (formato === 'pdf') return exportToPDF(res, data, 'Reporte de Pagos por Estatus', columns);
      if (formato === 'excel')
        return exportToExcel(res, data, 'Reporte de Pagos por Estatus', columns);
    } catch (error) {
      console.error('[PagosEstatus] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/lotes-por-estatus', async (req, res) => {
    try {
      const { formato } = req.query;
      const lotesService = new ItemsService('lotes', {
        schema: req.schema,
        knex: database,
        accountability: req.accountability,
      });
      const report = await lotesService.readByQuery({
        aggregate: { sum: ['precio_lista'], count: ['*'] }, // Asumiendo precio_lista para total
        groupBy: ['estatus'],
        limit: -1,
      });

      const data = report.map((item) => ({
        estatus: item.estatus,
        total: parseFloat(item.sum?.precio_lista || 0),
        cantidad: parseInt(item.count || 0),
      }));

      if (formato === 'json' || !formato) return res.json({ data });

      const columns = [
        { header: 'Estatus', key: 'estatus' },
        { header: 'Valor Total', key: 'total', format: formatCurrency },
        { header: 'Cantidad', key: 'cantidad' },
      ];

      if (formato === 'pdf') return exportToPDF(res, data, 'Reporte de Lotes por Estatus', columns);
      if (formato === 'excel')
        return exportToExcel(res, data, 'Reporte de Lotes por Estatus', columns);
    } catch (error) {
      console.error('[LotesEstatus] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // NUEVO: Ventas por Zona
  router.get('/ventas-por-zona', async (req, res) => {
    try {
      const { formato } = req.query;
      const result = await database('ventas')
        .join('lotes', 'ventas.lote_id', 'lotes.id')
        .select('lotes.zona')
        .sum('ventas.monto_total as total')
        .count('ventas.id as cantidad')
        .groupBy('lotes.zona')
        .orderBy('total', 'desc');

      const data = result.map((row) => ({
        zona: row.zona || 'Sin Zona',
        total: parseFloat(row.total || 0),
        cantidad: parseInt(row.cantidad || 0),
      }));

      if (formato === 'json' || !formato) return res.json({ data });

      const columns = [
        { header: 'Zona', key: 'zona' },
        { header: 'Total Ventas', key: 'total', format: formatCurrency },
        { header: 'Cantidad', key: 'cantidad' },
      ];

      if (formato === 'pdf') return exportToPDF(res, data, 'Reporte de Ventas por Zona', columns);
      if (formato === 'excel')
        return exportToExcel(res, data, 'Reporte de Ventas por Zona', columns);
    } catch (error) {
      console.error('[VentasZona] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // NUEVO: Comisiones por Vendedor
  router.get('/comisiones-por-vendedor', async (req, res) => {
    try {
      const { formato } = req.query;
      const result = await database('comisiones')
        .join('vendedores', 'comisiones.vendedor_id', 'vendedores.id')
        .select('vendedores.nombre', 'vendedores.apellido_paterno')
        .sum('comisiones.monto_comision as total')
        .count('comisiones.id as cantidad')
        .whereNot('comisiones.estatus', 'cancelada')
        .groupBy('vendedores.id', 'vendedores.nombre', 'vendedores.apellido_paterno')
        .orderBy('total', 'desc');

      const data = result.map((row) => ({
        vendedor: `${row.nombre} ${row.apellido_paterno || ''}`.trim(),
        total: parseFloat(row.total || 0),
        cantidad: parseInt(row.cantidad || 0),
      }));

      if (formato === 'json' || !formato) return res.json({ data });

      const columns = [
        { header: 'Vendedor', key: 'vendedor' },
        { header: 'Total Comisiones', key: 'total', format: formatCurrency },
        { header: 'Cantidad', key: 'cantidad' },
      ];

      if (formato === 'pdf')
        return exportToPDF(res, data, 'Reporte de Comisiones por Vendedor', columns);
      if (formato === 'excel')
        return exportToExcel(res, data, 'Reporte de Comisiones por Vendedor', columns);
    } catch (error) {
      console.error('[ComisionesVendedor] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ---------------------------

  console.log('✅ Endpoint /crm-analytics registrado correctamente');

  router.use((req, res, next) => {
    console.log('[CRM-ANALYTICS] Request:', req.method, req.path);
    next();
  });

  // AUTO-FIX: Grant permissions on startup
  if (process.env.CRM_ANALYTICS_DISABLE_AUTOFIX === '1') {
    console.warn('[CRM-ANALYTICS] Auto-permissions disabled by env (CRM_ANALYTICS_DISABLE_AUTOFIX=1)');
  } else {
    (async () => {
      try {
        const { setupPermissions } = await import('./permissions.js');
        await setupPermissions(services, database, getSchema);
      } catch (err) {
        console.error('[CRM-ANALYTICS] Startup Error:', err);
      }
    })();
  }

  router.get('/debug/permissions', async (req, res) => {
    try {
      const permissionsService = new ItemsService('directus_permissions', {
        schema: req.schema,
        knex: database,
      });
      const rolesService = new ItemsService('directus_roles', {
        schema: req.schema,
        knex: database,
      });

      const roles = await rolesService.readByQuery({ limit: -1 });
      const permissions = await permissionsService.readByQuery({
        limit: 50,
        sort: ['-id'],
      });

      res.json({ roles, permissions });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/resumen', async (req, res) => {
    try {
      // 1. Total Ventas (Monto Total de ventas activas)
      const ventasResult = await database('ventas')
        .where('estatus', '!=', 'cancelada')
        .sum('monto_total as total')
        .count('* as count')
        .first();

      // 2. Total Pagos (Recaudado)
      const pagosResult = await database('pagos')
        .where('estatus', 'pagado')
        .sum('monto as total')
        .first();

      // 3. Lotes Disponibles
      const lotesResult = await database('lotes')
        .where('estatus', 'disponible')
        .count('* as count')
        .first();

      // 4. Clientes Activos (Total clientes)
      const clientesResult = await database('clientes').count('* as count').first();

      res.json({
        total_ventas: parseFloat(ventasResult?.total || 0),
        cantidad_ventas: parseInt(ventasResult?.count || 0),
        total_pagos: parseFloat(pagosResult?.total || 0),
        lotes_disponibles: parseInt(lotesResult?.count || 0),
        clientes_activos: parseInt(clientesResult?.count || 0),
      });
    } catch (error) {
      console.error('❌ Error en /resumen:', error);
      res.status(503).json({ error: error.message });
    }
  });
};

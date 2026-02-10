import { exportToPDF, exportToExcel, formatCurrency, formatDate } from './utils.js';

console.log('LOADING REPORTES EXTENSION - SRC/INDEX.JS');

export default (router, { services, database }) => {
  console.log('REGISTERING REPORTES ROUTES');
  console.log('ROUTER KEYS:', Object.keys(router));
  const { ItemsService } = services;

  router.get('/', (req, res) => res.send('Reportes Endpoint Working'));

  router.get('/ventas-detallado', async (req, res) => {
    try {
      const { fecha_inicio, fecha_fin, vendedor_id, zona, formato } = req.query;
      const ventasService = new ItemsService('ventas', {
        schema: req.schema,
        knex: database,
        accountability: req.accountability,
      });

      const filter = { _and: [] };
      if (fecha_inicio) filter._and.push({ fecha_venta: { _gte: fecha_inicio } });
      if (fecha_fin) filter._and.push({ fecha_venta: { _lte: fecha_fin } });
      if (vendedor_id) filter._and.push({ vendedor_id: { _eq: vendedor_id } });
      if (zona) filter._and.push({ lote_id: { zona: { _eq: zona } } });

      const ventas = await ventasService.readByQuery({
        filter,
        fields: [
          'id',
          'fecha_venta',
          'monto_total',
          'estatus',
          'cliente_id.nombre',
          'cliente_id.email',
          'vendedor_id.nombre',
          'lote_id.numero_lote',
          'lote_id.zona',
          'enganche',
        ],
        limit: -1,
      });

      if (formato === 'json' || !formato) return res.json(ventas);

      const columns = [
        { header: 'ID Venta', key: 'id' },
        { header: 'Fecha', key: 'fecha_venta', format: formatDate },
        { header: 'Cliente', key: 'cliente_id.nombre' },
        { header: 'Vendedor', key: 'vendedor_id.nombre' },
        { header: 'Lote', key: 'lote_id.numero_lote' },
        { header: 'Zona', key: 'lote_id.zona' },
        { header: 'Monto Total', key: 'monto_total', format: formatCurrency },
        { header: 'Enganche', key: 'enganche', format: formatCurrency },
        { header: 'Estatus', key: 'estatus' },
      ];

      if (formato === 'pdf')
        return exportToPDF(res, ventas, 'Reporte de Ventas Detallado', columns);
      if (formato === 'excel')
        return exportToExcel(res, ventas, 'Reporte de Ventas Detallado', columns);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/pagos-historico', async (req, res) => {
    try {
      const { fecha_inicio, fecha_fin, estatus, venta_id, formato } = req.query;
      const pagosService = new ItemsService('pagos', {
        schema: req.schema,
        knex: database,
        accountability: req.accountability,
      });

      const filter = { _and: [] };
      if (fecha_inicio) filter._and.push({ fecha_pago: { _gte: fecha_inicio } });
      if (fecha_fin) filter._and.push({ fecha_pago: { _lte: fecha_fin } });
      if (estatus) filter._and.push({ estatus: { _eq: estatus } });
      if (venta_id) filter._and.push({ venta_id: { _eq: venta_id } });

      const pagos = await pagosService.readByQuery({
        filter,
        fields: [
          'id',
          'fecha_pago',
          'monto',
          'concepto',
          'estatus',
          'venta_id.id',
          'venta_id.cliente_id.nombre',
        ],
        limit: -1,
      });

      const today = new Date();
      const pagosConMora = pagos.map((p) => {
        let dias_mora = 0;
        const fechaPago = new Date(p.fecha_pago);
        if (p.estatus !== 'pagado' && fechaPago < today) {
          const diffTime = Math.abs(today - fechaPago);
          dias_mora = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        return { ...p, dias_mora };
      });

      if (formato === 'json' || !formato) return res.json(pagosConMora);

      const columns = [
        { header: 'ID Pago', key: 'id' },
        { header: 'Fecha', key: 'fecha_pago', format: formatDate },
        { header: 'Venta ID', key: 'venta_id.id' },
        { header: 'Cliente', key: 'venta_id.cliente_id.nombre' },
        { header: 'Concepto', key: 'concepto' },
        { header: 'Monto', key: 'monto', format: formatCurrency },
        { header: 'Estatus', key: 'estatus' },
        { header: 'Días Mora', key: 'dias_mora' },
      ];

      if (formato === 'pdf') return exportToPDF(res, pagosConMora, 'Historico de Pagos', columns);
      if (formato === 'excel')
        return exportToExcel(res, pagosConMora, 'Historico de Pagos', columns);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/comisiones-detallado', async (req, res) => {
    try {
      const { fecha_inicio, fecha_fin, vendedor_id, estatus, formato } = req.query;
      // Assuming 'comisiones' collection exists, otherwise fallback to 'ventas' logic
      let data = [];
      try {
        const comisionesService = new ItemsService('comisiones', {
          schema: req.schema,
          knex: database,
          accountability: req.accountability,
        });
        const filter = { _and: [] };
        // Add filters if collection exists
        if (vendedor_id) filter._and.push({ vendedor_id: { _eq: vendedor_id } });
        // Date filtering might depend on schema
        data = await comisionesService.readByQuery({ filter, fields: ['*'], limit: -1 });
      } catch (e) {
        // Fallback: Calculate from sales
        const ventasService = new ItemsService('ventas', {
          schema: req.schema,
          knex: database,
          accountability: req.accountability,
        });
        const filter = { _and: [] };
        if (fecha_inicio) filter._and.push({ fecha_venta: { _gte: fecha_inicio } });
        if (fecha_fin) filter._and.push({ fecha_venta: { _lte: fecha_fin } });
        if (vendedor_id) filter._and.push({ vendedor_id: { _eq: vendedor_id } });

        const ventas = await ventasService.readByQuery({
          filter,
          fields: [
            'id',
            'fecha_venta',
            'monto_total',
            'vendedor_id.nombre',
            'vendedor_id.comision_porcentaje',
          ],
          limit: -1,
        });

        data = ventas.map((v) => ({
          venta_id: v.id,
          vendedor: v.vendedor_id?.nombre,
          fecha: v.fecha_venta,
          monto_venta: v.monto_total,
          porcentaje: v.vendedor_id?.comision_porcentaje || 0,
          comision_calculada: (v.monto_total * (v.vendedor_id?.comision_porcentaje || 0)) / 100,
        }));
      }

      if (formato === 'json' || !formato) return res.json(data);

      const columns = [
        { header: 'Venta', key: 'venta_id' },
        { header: 'Vendedor', key: 'vendedor' },
        { header: 'Fecha', key: 'fecha', format: formatDate },
        { header: 'Monto Venta', key: 'monto_venta', format: formatCurrency },
        { header: 'Comisión', key: 'comision_calculada', format: formatCurrency },
      ];

      if (formato === 'pdf') return exportToPDF(res, data, 'Reporte de Comisiones', columns);
      if (formato === 'excel') return exportToExcel(res, data, 'Reporte de Comisiones', columns);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/estado-cuenta-cliente', async (req, res) => {
    try {
      const { fecha_corte, formato } = req.query;
      let targetClienteId = req.query.cliente_id;

      // SECURITY: Validar autenticación
      if (!req.accountability || !req.accountability.user) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      // SECURITY: Verificar si el usuario actual es un Cliente para forzar su contexto
      const currentUserId = req.accountability.user;
      // Usamos contexto admin temporalmente SOLO para resolver la identidad del cliente asociado al usuario
      const clientesResolverService = new ItemsService('clientes', {
        schema: req.schema,
        knex: database,
      });

      const clientesAsociados = await clientesResolverService.readByQuery({
        filter: { user_id: { _eq: currentUserId } },
        fields: ['id'],
        limit: 1,
      });

      if (clientesAsociados && clientesAsociados.length > 0) {
        // Es un cliente: FORZAR su ID ignorando el query param para evitar IDOR
        targetClienteId = clientesAsociados[0].id;
      } else {
        // No es cliente (Admin/Staff): Requerir ID explícito
        // La seguridad final recaerá en los permisos RLS de los servicios de ventas/pagos
        if (!targetClienteId)
          return res
            .status(400)
            .json({ error: 'cliente_id es requerido para usuarios administrativos' });
      }

      // SECURITY: Instanciar servicios con accountability para aplicar RLS/Permisos del rol actual
      const serviceCtx = { schema: req.schema, knex: database, accountability: req.accountability };
      const ventasService = new ItemsService('ventas', serviceCtx);
      const pagosService = new ItemsService('pagos', serviceCtx);

      const ventas = await ventasService.readByQuery({
        filter: { cliente_id: { _eq: targetClienteId } },
        fields: ['id', 'lote_id.numero_lote', 'monto_total', 'fecha_venta'],
        limit: -1,
      });

      const pagos = await pagosService.readByQuery({
        filter: {
          _and: [{ venta_id: { _in: ventas.map((v) => v.id) } }, { estatus: { _eq: 'pagado' } }],
        },
        fields: ['id', 'venta_id', 'monto', 'fecha_pago'],
        limit: -1,
      });

      // Filter payments by date if fecha_corte is present
      const pagosFiltrados = fecha_corte ? pagos.filter((p) => p.fecha_pago <= fecha_corte) : pagos;

      const estadoCuenta = ventas.map((venta) => {
        const pagosVenta = pagosFiltrados.filter((p) => p.venta_id === venta.id);
        const totalPagado = pagosVenta.reduce((sum, p) => sum + parseFloat(p.monto), 0);
        return {
          venta_id: venta.id,
          lote: venta.lote_id?.numero_lote,
          fecha_venta: venta.fecha_venta,
          monto_total: venta.monto_total,
          pagado: totalPagado,
          pendiente: parseFloat(venta.monto_total) - totalPagado,
        };
      });

      if (formato === 'json' || !formato) return res.json(estadoCuenta);

      const columns = [
        { header: 'Venta', key: 'venta_id' },
        { header: 'Lote', key: 'lote' },
        { header: 'Fecha', key: 'fecha_venta', format: formatDate },
        { header: 'Total Venta', key: 'monto_total', format: formatCurrency },
        { header: 'Pagado', key: 'pagado', format: formatCurrency },
        { header: 'Saldo Pendiente', key: 'pendiente', format: formatCurrency },
      ];

      if (formato === 'pdf')
        return exportToPDF(res, estadoCuenta, 'Estado de Cuenta Cliente', columns);
      if (formato === 'excel')
        return exportToExcel(res, estadoCuenta, 'Estado de Cuenta Cliente', columns);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/cobranza-mensual', async (req, res) => {
    try {
      const { mes, año, formato } = req.query;
      // Need start and end of month
      // Assuming 'pagos' contains scheduled payments with status 'pendiente'
      // or 'pagado'.

      let startDate, endDate;
      if (mes && año) {
        startDate = new Date(año, mes - 1, 1).toISOString().split('T')[0];
        endDate = new Date(año, mes, 0).toISOString().split('T')[0];
      }

      const pagosService = new ItemsService('pagos', { schema: req.schema, knex: database });

      const filter = { _and: [] };
      if (startDate) filter._and.push({ fecha_pago: { _gte: startDate } });
      if (endDate) filter._and.push({ fecha_pago: { _lte: endDate } });

      const pagos = await pagosService.readByQuery({
        filter,
        fields: ['id', 'fecha_pago', 'monto', 'estatus', 'venta_id.cliente_id.nombre'],
        limit: -1,
      });

      // Calculate stats
      const totalEsperado = pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
      const totalPagado = pagos
        .filter((p) => p.estatus === 'pagado')
        .reduce((sum, p) => sum + parseFloat(p.monto), 0);
      const porcentajeCobranza = totalEsperado > 0 ? (totalPagado / totalEsperado) * 100 : 0;

      // For the report list, just return the payments
      const data = pagos.map((p) => ({
        ...p,
        cliente: p.venta_id?.cliente_id?.nombre,
      }));

      // If JSON, might want to include summary stats
      if (formato === 'json' || !formato) {
        return res.json({
          resumen: {
            total_esperado: totalEsperado,
            total_pagado: totalPagado,
            porcentaje_cobranza: porcentajeCobranza,
          },
          detalle: data,
        });
      }

      // For PDF/Excel, just list the payments, maybe title includes stats?
      const columns = [
        { header: 'Fecha', key: 'fecha_pago', format: formatDate },
        { header: 'Cliente', key: 'cliente' },
        { header: 'Monto', key: 'monto', format: formatCurrency },
        { header: 'Estatus', key: 'estatus' },
      ];

      if (formato === 'pdf')
        return exportToPDF(
          res,
          data,
          `Cobranza Mensual ${mes}/${año} - ${porcentajeCobranza.toFixed(1)}%`,
          columns
        );
      if (formato === 'excel')
        return exportToExcel(res, data, `Cobranza Mensual ${mes}-${año}`, columns);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/lotes-estatus', async (req, res) => {
    try {
      const { zona, manzana, formato } = req.query;
      const lotesService = new ItemsService('lotes', { schema: req.schema, knex: database });

      const filter = { _and: [] };
      if (zona) filter._and.push({ zona: { _eq: zona } });
      if (manzana) filter._and.push({ manzana: { _eq: manzana } });

      const lotes = await lotesService.readByQuery({
        filter,
        fields: ['id', 'numero_lote', 'zona', 'manzana', 'area', 'valor', 'estatus'],
        limit: -1,
      });

      if (formato === 'json' || !formato) return res.json(lotes);

      const columns = [
        { header: 'ID', key: 'id' },
        { header: 'Numero Lote', key: 'numero_lote' },
        { header: 'Zona', key: 'zona' },
        { header: 'Manzana', key: 'manzana' },
        { header: 'Área (m2)', key: 'area' },
        { header: 'Valor', key: 'valor', format: formatCurrency },
        { header: 'Estatus', key: 'estatus' },
      ];

      if (formato === 'pdf')
        return exportToPDF(res, lotes, 'Reporte de Lotes por Estatus', columns);
      if (formato === 'excel')
        return exportToExcel(res, lotes, 'Reporte de Lotes por Estatus', columns);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};

import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

class SimpleCache {
  constructor(ttlSeconds = 300) {
    this.cache = new Map();
    this.ttl = ttlSeconds * 1000;
  }
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
  set(key, value) {
    this.cache.set(key, { value, expiry: Date.now() + this.ttl });
  }
  generateKey(prefix, params) {
    return `${prefix}:${JSON.stringify(params)}`;
  }
}

export class ReportsService {
  constructor({ services, database, getSchema }) {
    this.itemsService = services.ItemsService;
    this.database = database;
    this.getSchema = getSchema;
    this.cache = new SimpleCache(300); // 5 minutes cache
  }

  async generateIncomeReport({ fecha_inicio, fecha_fin, agrupacion = 'dia', formato = 'json' }) {
    const schema = await this.getSchema();
    const pagosService = new this.itemsService('pagos', { schema });

    // Query pagos in range
    const pagos = await pagosService.readByQuery({
      filter: {
        _and: [
          { fecha_pago: { _gte: fecha_inicio } },
          { fecha_pago: { _lte: fecha_fin } },
          { estatus: { _eq: 'pagado' } },
        ],
      },
      fields: ['fecha_pago', 'monto_pagado', 'metodo_pago'],
    });

    // Process data
    const data = this.groupData(pagos, agrupacion);

    if (formato === 'excel') {
      return await this.generateExcel(data, 'Reporte de Ingresos');
    } else if (formato === 'pdf') {
      return await this.generatePDF(data, 'Reporte de Ingresos');
    }

    return data;
  }

  // --- New Reports (Task: Eliminar Mocks) ---

  async getSalesReport({
    fecha_inicio,
    fecha_fin,
    vendedor_id,
    propiedad_id,
    estado,
    agrupacion = 'dia',
    page = 1,
    limit = 100,
  }) {
    const start = new Date(fecha_inicio);
    const end = new Date(fecha_fin);
    const offset = (page - 1) * limit;

    let groupByRaw;
    if (agrupacion === 'mes') groupByRaw = "DATE_FORMAT(fecha_venta, '%Y-%m-01')";
    else if (agrupacion === 'semana')
      groupByRaw = "STR_TO_DATE(CONCAT(YEARWEEK(fecha_venta, 1), ' Sunday'), '%X%V %W')";
    else groupByRaw = 'DATE(fecha_venta)';

    const query = this.database('ventas')
      .select(
        this.database.raw(`${groupByRaw} as date`),
        this.database.raw('COALESCE(SUM(monto_total), 0) as total'),
        this.database.raw('COUNT(id) as count')
      )
      .whereBetween('fecha_venta', [start, end]);

    if (vendedor_id) query.where('vendedor_id', vendedor_id);
    if (propiedad_id) query.where('propiedad_id', propiedad_id);
    if (estado) query.where('estatus', estado);

    query.groupByRaw(groupByRaw).orderBy('date', 'asc').limit(limit).offset(offset);

    const results = await query;

    return results.map((row) => ({
      date: new Date(row.date).toISOString().split('T')[0],
      total: parseFloat(row.total),
      count: parseInt(row.count),
    }));
  }

  async getClientReport({ fecha_inicio, fecha_fin }) {
    const start = new Date(fecha_inicio);
    const end = new Date(fecha_fin);

    const stats = await this.database('clientes')
      .select(
        this.database.raw(
          `COUNT(CASE WHEN date_created >= ? AND date_created <= ? THEN 1 END) as nuevos`,
          [start, end]
        ),
        this.database.raw("COUNT(CASE WHEN estatus = 'activo' THEN 1 END) as activos"),
        this.database.raw("COUNT(CASE WHEN estatus = 'inactivo' THEN 1 END) as inactivos"),
        this.database.raw('COUNT(*) as total')
      )
      .first();

    return {
      nuevos: parseInt(stats?.nuevos || 0),
      activos: parseInt(stats?.activos || 0),
      inactivos: parseInt(stats?.inactivos || 0),
      total: parseInt(stats?.activos || 0) + parseInt(stats?.inactivos || 0), // Or just use total from DB if that's what we want
    };
  }

  async getCommissionReport({ fecha_inicio, fecha_fin, vendedor_id }) {
    const start = new Date(fecha_inicio);
    const end = new Date(fecha_fin);

    // Assuming 'comisiones' table exists, linked to 'ventas' and 'directus_users' (vendedores)
    const query = this.database('comisiones')
      .select(
        this.database.raw('SUM(monto) as total'),
        this.database.raw('COUNT(id) as count'),
        'estatus'
      )
      .whereBetween('fecha_generacion', [start, end])
      .groupBy('estatus');

    if (vendedor_id) query.where('vendedor_id', vendedor_id);

    const results = await query;

    const report = {
      total_pagadas: 0,
      total_pendientes: 0,
      count_pagadas: 0,
      count_pendientes: 0,
      breakdown: results,
    };

    results.forEach((row) => {
      const monto = parseFloat(row.total || 0);
      const count = parseInt(row.count || 0);
      if (row.estatus === 'pagada') {
        report.total_pagadas += monto;
        report.count_pagadas += count;
      } else {
        report.total_pendientes += monto;
        report.count_pendientes += count;
      }
    });

    return report;
  }

  async getPaymentsReport({
    fecha_inicio,
    fecha_fin,
    vendedor_id,
    metodo_pago,
    estatus,
    agrupacion = 'dia',
    page = 1,
    limit = 100,
  }) {
    const start = new Date(fecha_inicio);
    const end = new Date(fecha_fin);
    const offset = (page - 1) * limit;

    let groupByRaw;
    if (agrupacion === 'mes') groupByRaw = "DATE_FORMAT(pagos.fecha_pago, '%Y-%m-01')";
    else if (agrupacion === 'semana')
      groupByRaw = "STR_TO_DATE(CONCAT(YEARWEEK(pagos.fecha_pago, 1), ' Sunday'), '%X%V %W')";
    else groupByRaw = 'DATE(pagos.fecha_pago)';

    const query = this.database('pagos')
      .select(
        this.database.raw(`${groupByRaw} as date`),
        this.database.raw('COALESCE(SUM(pagos.monto_pagado), 0) as total'),
        this.database.raw('COUNT(pagos.id) as count'),
        this.database.raw(
          "COALESCE(SUM(CASE WHEN pagos.metodo_pago = 'efectivo' THEN pagos.monto_pagado ELSE 0 END), 0) as efectivo"
        ),
        this.database.raw(
          "COALESCE(SUM(CASE WHEN pagos.metodo_pago = 'transferencia' THEN pagos.monto_pagado ELSE 0 END), 0) as transferencia"
        ),
        this.database.raw(
          "COALESCE(SUM(CASE WHEN pagos.metodo_pago = 'cheque' THEN pagos.monto_pagado ELSE 0 END), 0) as cheque"
        ),
        this.database.raw(
          "COALESCE(SUM(CASE WHEN pagos.metodo_pago = 'tarjeta' THEN pagos.monto_pagado ELSE 0 END), 0) as tarjeta"
        ),
        this.database.raw(
          "COALESCE(SUM(CASE WHEN pagos.metodo_pago = 'deposito' THEN pagos.monto_pagado ELSE 0 END), 0) as deposito"
        ),
        this.database.raw(
          "COALESCE(SUM(CASE WHEN pagos.metodo_pago = 'stripe_subscription' THEN pagos.monto_pagado ELSE 0 END), 0) as stripe_subscription"
        )
      )
      .leftJoin('ventas', 'pagos.venta_id', 'ventas.id')
      .whereBetween('pagos.fecha_pago', [start, end]);

    if (vendedor_id) query.where('ventas.vendedor_id', vendedor_id);
    if (metodo_pago) query.where('pagos.metodo_pago', metodo_pago);
    if (estatus) query.where('pagos.estatus', estatus);

    query.groupByRaw(groupByRaw).orderBy('date', 'asc').limit(limit).offset(offset);

    const results = await query;

    return results.map((row) => ({
      date: new Date(row.date).toISOString().split('T')[0],
      total: parseFloat(row.total),
      count: parseInt(row.count),
      methods: {
        efectivo: parseFloat(row.efectivo),
        transferencia: parseFloat(row.transferencia),
        cheque: parseFloat(row.cheque),
        tarjeta: parseFloat(row.tarjeta),
        deposito: parseFloat(row.deposito),
        stripe_subscription: parseFloat(row.stripe_subscription),
      },
    }));
  }

  async getKPIsReport({ fecha_inicio, fecha_fin }) {
    const start = new Date(fecha_inicio);
    const end = new Date(fecha_fin);

    const [totalVentas, totalIngresos, clientesActivos, comisionesPendientes] = await Promise.all([
      // Total Sales Volume
      this.database('ventas')
        .sum('monto_total as total')
        .whereBetween('fecha_venta', [start, end])
        .first(),

      // Total Income (Payments)
      this.database('pagos')
        .sum('monto_pagado as total')
        .whereBetween('fecha_pago', [start, end])
        .where('estatus', 'pagado')
        .first(),

      // Active Clients (Snapshot, not range dependent usually, but let's stick to current state)
      this.database('clientes').count('id as count').where('estatus', 'activo').first(),

      // Pending Commissions
      this.database('comisiones').sum('monto as total').where('estatus', 'pendiente').first(),
    ]);

    return {
      total_sales_volume: parseFloat(totalVentas?.total || 0),
      total_income: parseFloat(totalIngresos?.total || 0),
      active_clients: parseInt(clientesActivos?.count || 0),
      pending_commissions: parseFloat(comisionesPendientes?.total || 0),
    };
  }

  // --- Subscription & Finance Reports (Task 6.1.5) ---

  async getSubscriptionMetrics(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const newSubs = await this.database('suscripciones')
      .count('id as count')
      .whereBetween('date_created', [start, end])
      .first();

    const canceledSubs = await this.database('suscripciones')
      .count('id as count')
      .whereBetween('fecha_cancelacion', [start, end])
      .first();

    const activeSubs = await this.database('suscripciones')
      .count('id as count')
      .where('estado', 'active')
      .first();

    return {
      new_subscriptions: parseInt(newSubs?.count || 0),
      canceled_subscriptions: parseInt(canceledSubs?.count || 0),
      total_active: parseInt(activeSubs?.count || 0),
    };
  }

  async getRevenueByPlan(startDate, endDate) {
    const revenueByAmount = await this.database('pagos')
      .select('monto', this.database.raw('SUM(monto_pagado) as total'))
      .where('metodo_pago', 'stripe_subscription')
      .whereBetween('fecha_pago', [new Date(startDate), new Date(endDate)])
      .groupBy('monto');

    // Heuristic: Map amount to plan name (This should be replaced by real plan lookup)
    const breakdown = revenueByAmount.map((r) => ({
      plan: `Plan $${r.monto}`,
      revenue: parseFloat(r.total),
    }));

    const total = breakdown.reduce((acc, curr) => acc + curr.revenue, 0);

    return {
      total_revenue: total,
      breakdown: breakdown,
    };
  }

  async getMRRHistory() {
    const history = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      // Set to end of month for accurate MRR snapshot
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const mrrData = await this.getMRR(endOfMonth);
      history.push({
        date: date.toISOString().slice(0, 7), // YYYY-MM
        mrr: mrrData.mrr,
      });
    }
    return history;
  }

  async getDashboardMetrics(startDate, endDate) {
    const [subs, mrr, churn, revenue, refunds, failure, mrrHistory, forecast] = await Promise.all([
      this.getSubscriptionMetrics(startDate, endDate),
      this.getMRR(),
      this.getChurnRate(startDate, endDate),
      this.getRevenueByPlan(startDate, endDate),
      this.getRefundMetrics(startDate, endDate),
      this.getPaymentFailureRate(startDate, endDate),
      this.getMRRHistory(),
      this.getRevenueForecast(),
    ]);

    return {
      subscriptions: subs,
      mrr: mrr,
      churn: churn,
      revenue: revenue,
      refunds: refunds,
      payment_health: failure,
      mrr_history: mrrHistory,
      revenue_forecast: forecast,
    };
  }

  async getMRR(date = new Date()) {
    const result = await this.database('suscripciones')
      .sum('monto as mrr')
      .where('estado', 'active')
      .where('fecha_inicio', '<=', date)
      .andWhere((builder) => {
        builder.whereNull('fecha_fin').orWhere('fecha_fin', '>=', date);
      })
      .first();

    return {
      mrr: parseFloat(result?.mrr || 0),
      currency: 'mxn',
    };
  }

  async getChurnRate(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startSubs = await this.database('suscripciones')
      .count('id as count')
      .where('fecha_inicio', '<', start)
      .andWhere((builder) => {
        builder.whereNull('fecha_cancelacion').orWhere('fecha_cancelacion', '>=', start);
      })
      .first();

    const startCount = parseInt(startSubs?.count || 0) || 1;

    const canceled = await this.database('suscripciones')
      .count('id as count')
      .whereBetween('fecha_cancelacion', [start, end])
      .first();

    const canceledCount = parseInt(canceled?.count || 0);

    return {
      churn_rate: (canceledCount / startCount) * 100,
      start_count: startCount,
      canceled_count: canceledCount,
    };
  }

  async getARPU(date = new Date()) {
    const mrrData = await this.getMRR(date);
    const activeSubs = await this.database('suscripciones')
      .count('id as count')
      .where('estado', 'active')
      .first();

    const count = parseInt(activeSubs?.count || 0) || 1;

    return {
      arpu: mrrData.mrr / count,
      active_users: count,
    };
  }

  async getRefundMetrics(startDate, endDate) {
    const result = await this.database('reembolsos')
      .select(this.database.raw('count(*) as count, sum(monto_reembolsado) as total'))
      .whereBetween('fecha_solicitud', [new Date(startDate), new Date(endDate)])
      .first();

    return {
      refund_count: parseInt(result?.count || 0),
      refund_amount: parseFloat(result?.total || 0),
    };
  }

  async getPaymentFailureRate(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const totalAttempts = await this.database('webhook_logs')
      .count('id as count')
      .whereIn('evento_tipo', ['invoice.payment_succeeded', 'invoice.payment_failed'])
      .whereBetween('fecha_recepcion', [start, end])
      .first();

    const failedAttempts = await this.database('webhook_logs')
      .count('id as count')
      .where('evento_tipo', 'invoice.payment_failed')
      .whereBetween('fecha_recepcion', [start, end])
      .first();

    const total = parseInt(totalAttempts?.count || 0) || 1;
    const failed = parseInt(failedAttempts?.count || 0);

    return {
      failure_rate: (failed / total) * 100,
      total_attempts: total,
      failed_attempts: failed,
    };
  }

  async getRevenueForecast() {
    // Basic Linear Regression Forecast (3 months) based on last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await this.database('pagos')
      .select(
        this.database.raw(
          "DATE_FORMAT(fecha_pago, '%Y-%m-01') as month_date, SUM(monto_pagado) as total"
        )
      )
      .where('fecha_pago', '>=', sixMonthsAgo)
      .groupByRaw("DATE_FORMAT(fecha_pago, '%Y-%m-01')")
      .orderBy('month_date', 'asc');

    const dataPoints = monthlyRevenue.map((row, index) => ({
      x: index,
      y: parseFloat(row.total),
    }));

    if (dataPoints.length < 2) return [];

    // Calculate slope (m) and intercept (b)
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((acc, p) => acc + p.x, 0);
    const sumY = dataPoints.reduce((acc, p) => acc + p.y, 0);
    const sumXY = dataPoints.reduce((acc, p) => acc + p.x * p.y, 0);
    const sumXX = dataPoints.reduce((acc, p) => acc + p.x * p.x, 0);

    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const b = (sumY - m * sumX) / n;

    const forecast = [];
    const lastDate = new Date();

    for (let i = 1; i <= 3; i++) {
      const nextX = n - 1 + i;
      const predictedRevenue = m * nextX + b;
      const nextMonth = new Date(lastDate);
      nextMonth.setMonth(lastDate.getMonth() + i);

      forecast.push({
        date: nextMonth.toISOString().slice(0, 7), // YYYY-MM
        predicted_revenue: Math.max(0, predictedRevenue),
      });
    }

    return forecast;
  }

  groupData(items, grouping) {
    const grouped = {};
    items.forEach((item) => {
      if (!item.fecha_pago) return;
      const date = new Date(item.fecha_pago);
      let key;

      if (grouping === 'mes') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (grouping === 'semana') {
        key = `${date.getFullYear()}-W${this.getWeek(date)}`;
      } else {
        // dia
        key =
          typeof item.fecha_pago === 'string'
            ? item.fecha_pago.split('T')[0]
            : date.toISOString().split('T')[0];
      }

      if (!grouped[key]) grouped[key] = { date: key, total: 0, count: 0 };
      grouped[key].total += Number(item.monto_pagado);
      grouped[key].count++;
    });
    return Object.values(grouped);
  }

  getWeek(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return weekNo;
  }

  async generateExcel(data, title) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reporte');

    sheet.columns = [
      { header: 'Fecha', key: 'date', width: 20 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Transacciones', key: 'count', width: 15 },
    ];

    sheet.addRows(data);

    return await workbook.xlsx.writeBuffer();
  }

  async generatePDF(data, title) {
    // jsPDF default export is generic, usually needs explicit import
    // If using module type, 'import { jsPDF } from "jspdf"' works.
    const doc = new jsPDF();
    doc.text(title, 14, 15);

    const tableData = data.map((row) => [row.date, `$${row.total.toFixed(2)}`, row.count]);

    doc.autoTable({
      head: [['Fecha', 'Total', 'Transacciones']],
      body: tableData,
      startY: 20,
    });

    // Return buffer
    // jspdf output('arraybuffer') returns ArrayBuffer, node buffer.from handles it.
    return Buffer.from(doc.output('arraybuffer'));
  }
}

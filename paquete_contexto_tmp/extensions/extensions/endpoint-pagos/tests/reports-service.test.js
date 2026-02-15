import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportsService } from '../src/reports-service.js';

// Mock ExcelJS and jsPDF
vi.mock('exceljs', () => {
  return {
    default: {
      Workbook: class {
        constructor() {
          this.addWorksheet = vi.fn().mockReturnValue({
            columns: [],
            addRows: vi.fn(),
          });
          this.xlsx = {
            writeBuffer: vi.fn().mockResolvedValue(Buffer.from('excel-data')),
          };
        }
      },
    },
  };
});

vi.mock('jspdf', () => {
  return {
    jsPDF: class {
      constructor() {
        this.text = vi.fn();
        this.autoTable = vi.fn();
        this.output = vi.fn().mockReturnValue(new ArrayBuffer(10));
      }
    },
  };
});

describe('ReportsService', () => {
  let reportsService;
  let mockDatabase;
  let mockGetSchema;
  let mockItemsService;
  let mockQueryBuilder;
  let mockPagosService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Knex Query Builder
    mockQueryBuilder = {
      count: vi.fn().mockReturnThis(),
      whereBetween: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(function (arg) {
        if (typeof arg === 'function') {
          arg(mockQueryBuilder);
        }
        return mockQueryBuilder;
      }),
      andWhere: vi.fn().mockImplementation(function (arg) {
        if (typeof arg === 'function') {
          arg(mockQueryBuilder);
        }
        return mockQueryBuilder;
      }),
      first: vi.fn(),
      select: vi.fn().mockReturnThis(),
      sum: vi.fn().mockReturnThis(),
      whereNull: vi.fn().mockReturnThis(),
      orWhere: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      groupByRaw: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      orderByRaw: vi.fn().mockReturnThis(),
      whereIn: vi.fn().mockReturnThis(),
      map: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
    };

    // Mock database function
    mockDatabase = vi.fn(() => mockQueryBuilder);
    mockDatabase.raw = vi.fn((val) => val);

    mockGetSchema = vi.fn().mockResolvedValue({});

    mockPagosService = {
      readByQuery: vi.fn(),
    };

    mockItemsService = vi.fn(function (collection) {
      if (collection === 'pagos') return mockPagosService;
      return {};
    });

    reportsService = new ReportsService({
      services: { ItemsService: mockItemsService },
      database: mockDatabase,
      getSchema: mockGetSchema,
    });
  });

  describe('generateIncomeReport', () => {
    it('should generate JSON report', async () => {
      const pagos = [
        { fecha_pago: '2023-01-01T12:00:00', monto_pagado: 100 },
        { fecha_pago: '2023-01-02T12:00:00', monto_pagado: 200 },
      ];
      mockPagosService.readByQuery.mockResolvedValue(pagos);

      const result = await reportsService.generateIncomeReport({
        fecha_inicio: '2023-01-01',
        fecha_fin: '2023-01-31',
        agrupacion: 'dia',
        formato: 'json',
      });

      expect(result).toHaveLength(2);
      expect(result[0].total).toBe(100);
      expect(mockPagosService.readByQuery).toHaveBeenCalled();
    });

    it('should generate Excel report', async () => {
      const pagos = [{ fecha_pago: '2023-01-01T12:00:00', monto_pagado: 100 }];
      mockPagosService.readByQuery.mockResolvedValue(pagos);

      const result = await reportsService.generateIncomeReport({
        fecha_inicio: '2023-01-01',
        fecha_fin: '2023-01-31',
        formato: 'excel',
      });

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should generate PDF report', async () => {
      const pagos = [{ fecha_pago: '2023-01-01T12:00:00', monto_pagado: 100 }];
      mockPagosService.readByQuery.mockResolvedValue(pagos);

      const result = await reportsService.generateIncomeReport({
        fecha_inicio: '2023-01-01',
        fecha_fin: '2023-01-31',
        formato: 'pdf',
      });

      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });

  describe('getSubscriptionMetrics', () => {
    it('should return subscription metrics', async () => {
      // Mock responses for 3 calls to database
      mockQueryBuilder.first
        .mockResolvedValueOnce({ count: 10 }) // newSubs
        .mockResolvedValueOnce({ count: 2 }) // canceledSubs
        .mockResolvedValueOnce({ count: 100 }); // activeSubs

      const result = await reportsService.getSubscriptionMetrics('2023-01-01', '2023-01-31');

      expect(result).toEqual({
        new_subscriptions: 10,
        canceled_subscriptions: 2,
        total_active: 100,
      });
    });

    it('should handle null database results', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce(null) // newSubs
        .mockResolvedValueOnce(null) // canceledSubs
        .mockResolvedValueOnce(null); // activeSubs

      const result = await reportsService.getSubscriptionMetrics('2023-01-01', '2023-01-31');

      expect(result).toEqual({
        new_subscriptions: 0,
        canceled_subscriptions: 0,
        total_active: 0,
      });
    });
  });

  describe('getMRR', () => {
    it('should return MRR', async () => {
      mockQueryBuilder.first.mockResolvedValue({ mrr: 5000 });

      const result = await reportsService.getMRR();

      expect(result).toEqual({ mrr: 5000, currency: 'mxn' });
      expect(mockQueryBuilder.sum).toHaveBeenCalledWith('monto as mrr');
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith('fecha_fin');
      expect(mockQueryBuilder.orWhere).toHaveBeenCalledWith('fecha_fin', '>=', expect.any(Date));
    });

    it('should handle null MRR', async () => {
      mockQueryBuilder.first.mockResolvedValue(null);
      const result = await reportsService.getMRR();
      expect(result.mrr).toBe(0);
    });
  });

  describe('getChurnRate', () => {
    it('should calculate churn rate', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce({ count: 100 }) // startSubs
        .mockResolvedValueOnce({ count: 5 }); // canceled

      const result = await reportsService.getChurnRate('2023-01-01', '2023-01-31');

      expect(result).toEqual({
        churn_rate: 5, // (5/100)*100
        start_count: 100,
        canceled_count: 5,
      });
    });

    it('should handle zero start count', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce({ count: 0 }) // startSubs
        .mockResolvedValueOnce({ count: 0 }); // canceled

      const result = await reportsService.getChurnRate('2023-01-01', '2023-01-31');
      expect(result.churn_rate).toBe(0);
      expect(result.start_count).toBe(1); // Defaults to 1 to avoid division by zero
    });
  });

  describe('getARPU', () => {
    it('should calculate ARPU', async () => {
      // getMRR mock
      mockQueryBuilder.first
        .mockResolvedValueOnce({ mrr: 10000 }) // getMRR
        .mockResolvedValueOnce({ count: 100 }); // activeSubs

      const result = await reportsService.getARPU();

      expect(result).toEqual({
        arpu: 100,
        active_users: 100,
      });
    });

    it('should handle zero active users', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce({ mrr: 10000 }) // getMRR
        .mockResolvedValueOnce({ count: 0 }); // activeSubs

      const result = await reportsService.getARPU();

      // count defaults to 1 to avoid division by zero
      expect(result.arpu).toBe(10000);
      expect(result.active_users).toBe(1);
    });
  });

  describe('getRefundMetrics', () => {
    it('should return refund metrics', async () => {
      mockQueryBuilder.first.mockResolvedValue({ count: 3, total: 450 });

      const result = await reportsService.getRefundMetrics('2023-01-01', '2023-01-31');

      expect(result).toEqual({
        refund_count: 3,
        refund_amount: 450,
      });
    });

    it('should handle null refund metrics', async () => {
      mockQueryBuilder.first.mockResolvedValue(null);
      const result = await reportsService.getRefundMetrics('2023-01-01', '2023-01-31');
      expect(result.refund_count).toBe(0);
      expect(result.refund_amount).toBe(0);
    });
  });

  describe('getPaymentFailureRate', () => {
    it('should calculate failure rate', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce({ count: 100 }) // totalAttempts
        .mockResolvedValueOnce({ count: 10 }); // failedAttempts

      const result = await reportsService.getPaymentFailureRate('2023-01-01', '2023-01-31');

      expect(result).toEqual({
        failure_rate: 10,
        total_attempts: 100,
        failed_attempts: 10,
      });
    });

    it('should handle zero total attempts', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce({ count: 0 }) // totalAttempts
        .mockResolvedValueOnce({ count: 0 }); // failedAttempts

      const result = await reportsService.getPaymentFailureRate('2023-01-01', '2023-01-31');

      expect(result.failure_rate).toBe(0);
      expect(result.total_attempts).toBe(1); // Defaults to 1
    });
  });

  describe('getRevenueForecast', () => {
    it('should return empty array if not enough data', async () => {
      // Mock database returning array directly (since it uses map/reduce)
      // But wait, the code calls `await this.database('pagos')...` which returns a promise resolving to an array?
      // Usually Knex returns array for select.
      // My mockQueryBuilder returns `this` for everything. I need to make the chain resolve to array.

      // `await this.database(...)` calls `mockDatabase` which returns `mockQueryBuilder`.
      // Then it chains `.select(...)`, `.where(...)`, etc.
      // Finally it awaits the builder. In Knex, builder is thenable.
      // In my mock, `mockQueryBuilder` is an object.
      // I should add `then` or `resolves` to `mockQueryBuilder`.

      // However, typically I just mock the final method.
      // `getRevenueForecast` ends with `.orderByRaw(...)`.
      // So `orderByRaw` should return the data promise?
      // Or I can make the builder thenable.

      mockQueryBuilder.then = function (resolve) {
        resolve([{ year: 2023, month: 1, total: 100 }]);
      };

      const result = await reportsService.getRevenueForecast();
      expect(result).toEqual([]);
    });

    it('should calculate linear regression forecast', async () => {
      const data = [
        { year: 2023, month: 1, total: 100 },
        { year: 2023, month: 2, total: 200 },
        { year: 2023, month: 3, total: 300 },
      ];
      // Linear growth: y = 100x + 100 (if x starts at 0 for month 1)
      // x=0 -> 100, x=1 -> 200, x=2 -> 300.
      // Next 3 months: x=3 -> 400, x=4 -> 500, x=5 -> 600.

      mockQueryBuilder.then = function (resolve) {
        resolve(data);
      };

      const result = await reportsService.getRevenueForecast();

      expect(result).toHaveLength(3);
      expect(result[0].predicted_revenue).toBeCloseTo(400);
      expect(result[1].predicted_revenue).toBeCloseTo(500);
      expect(result[2].predicted_revenue).toBeCloseTo(600);
    });
  });

  describe('getSalesReport', () => {
    it('should return sales report grouped by day', async () => {
      const mockVentas = [
        { date: new Date('2023-01-01T12:00:00'), total: 3000, count: 2 },
        { date: new Date('2023-01-02T10:00:00'), total: 1500, count: 1 },
      ];

      // Mock query chain
      mockQueryBuilder.then = function (resolve) {
        resolve(mockVentas);
      };

      const result = await reportsService.getSalesReport({
        fecha_inicio: '2023-01-01',
        fecha_fin: '2023-01-31',
        agrupacion: 'dia',
        limit: 10,
        page: 1,
      });

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2023-01-01');
      expect(result[0].total).toBe(3000);
      expect(result[1].date).toBe('2023-01-02');
      expect(result[1].total).toBe(1500);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(0);
    });

    it('should apply filters', async () => {
      mockQueryBuilder.then = function (resolve) {
        resolve([]);
      };

      await reportsService.getSalesReport({
        fecha_inicio: '2023-01-01',
        fecha_fin: '2023-01-31',
        vendedor_id: 'v1',
        propiedad_id: 'p1',
        estado: 'vendido',
      });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('vendedor_id', 'v1');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('propiedad_id', 'p1');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('estatus', 'vendido');
    });
  });

  describe('getClientReport', () => {
    it('should return client metrics', async () => {
      const mockStats = {
        nuevos: 5,
        activos: 50,
        inactivos: 10,
        total: 60,
      };
      mockQueryBuilder.first.mockResolvedValueOnce(mockStats);

      const result = await reportsService.getClientReport({
        fecha_inicio: '2023-01-01',
        fecha_fin: '2023-01-31',
      });

      expect(result).toEqual(mockStats);
    });
  });

  describe('getCommissionReport', () => {
    it('should return commission breakdown', async () => {
      const mockComisiones = [
        { estatus: 'pagada', total: 1000, count: 2 },
        { estatus: 'pendiente', total: 500, count: 1 },
      ];

      mockQueryBuilder.then = function (resolve) {
        resolve(mockComisiones);
      };

      const result = await reportsService.getCommissionReport({
        fecha_inicio: '2023-01-01',
        fecha_fin: '2023-01-31',
      });

      expect(result).toEqual({
        total_pagadas: 1000,
        count_pagadas: 2,
        total_pendientes: 500,
        count_pendientes: 1,
        breakdown: mockComisiones,
      });
    });

    it('should filter by seller', async () => {
      mockQueryBuilder.then = function (resolve) {
        resolve([]);
      };

      await reportsService.getCommissionReport({
        fecha_inicio: '2023-01-01',
        fecha_fin: '2023-01-31',
        vendedor_id: 'v1',
      });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('vendedor_id', 'v1');
    });
  });

  describe('groupData', () => {
    it('should group data by day', () => {
      const items = [
        { fecha_pago: '2023-01-01T10:00:00Z', monto_pagado: 100 },
        { fecha_pago: '2023-01-01T12:00:00Z', monto_pagado: 50 },
        { fecha_pago: '2023-01-02T10:00:00Z', monto_pagado: 200 },
      ];

      const result = reportsService.groupData(items, 'dia');

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.date === '2023-01-01').total).toBe(150);
      expect(result.find((r) => r.date === '2023-01-02').total).toBe(200);
    });

    it('should group data by month', () => {
      const items = [
        { fecha_pago: '2023-01-01T12:00:00', monto_pagado: 100 },
        { fecha_pago: '2023-01-15T12:00:00', monto_pagado: 50 },
        { fecha_pago: '2023-02-01T12:00:00', monto_pagado: 200 },
      ];

      const result = reportsService.groupData(items, 'mes');

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.date === '2023-01').total).toBe(150);
      expect(result.find((r) => r.date === '2023-02').total).toBe(200);
    });

    it('should group data by week', () => {
      // 2023-01-01 is Sunday (Week 1 or 52 depending on ISO)
      // 2023-01-08 is Sunday (Next week)
      const items = [
        { fecha_pago: '2023-01-01T12:00:00', monto_pagado: 100 },
        { fecha_pago: '2023-01-08T12:00:00', monto_pagado: 200 },
      ];

      const result = reportsService.groupData(items, 'semana');

      expect(result).toHaveLength(2);
      // Week numbers depend on the implementation of getWeek.
      // 2023-01-01 might be week 52 of previous year or week 1.
      // Let's check format "YYYY-W[weekNo]"
      expect(result[0].date).toMatch(/^\d{4}-W\d+$/);
      expect(result[1].date).toMatch(/^\d{4}-W\d+$/);
      expect(result[0].total).toBe(100);
      expect(result[1].total).toBe(200);
    });

    it('should ignore items without fecha_pago', () => {
      const items = [
        { monto_pagado: 100 }, // Missing fecha_pago
        { fecha_pago: '2023-01-01T12:00:00', monto_pagado: 200 },
      ];
      const result = reportsService.groupData(items, 'dia');
      expect(result).toHaveLength(1);
      expect(result[0].total).toBe(200);
    });

    it('should handle Date objects in fecha_pago', () => {
      const items = [{ fecha_pago: new Date('2023-01-01T12:00:00Z'), monto_pagado: 100 }];
      const result = reportsService.groupData(items, 'dia');
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2023-01-01');
    });
  });

  describe('getPaymentsReport', () => {
    it('should return payments report grouped by day with breakdown', async () => {
      const mockPagos = [
        {
          date: new Date('2023-01-01'),
          total: 300,
          count: 2,
          efectivo: 100,
          transferencia: 200,
          cheque: 0,
          tarjeta: 0,
          deposito: 0,
          stripe_subscription: 0,
        },
        {
          date: new Date('2023-01-02'),
          total: 300,
          count: 1,
          efectivo: 300,
          transferencia: 0,
          cheque: 0,
          tarjeta: 0,
          deposito: 0,
          stripe_subscription: 0,
        },
      ];

      mockQueryBuilder.then = function (resolve) {
        resolve(mockPagos);
      };

      const result = await reportsService.getPaymentsReport({
        fecha_inicio: '2023-01-01',
        fecha_fin: '2023-01-31',
        agrupacion: 'dia',
        limit: 10,
      });

      expect(result).toHaveLength(2);
      // Day 1
      expect(result[0].date).toBe('2023-01-01');
      expect(result[0].total).toBe(300);
      expect(result[0].methods['efectivo']).toBe(100);
      expect(result[0].methods['transferencia']).toBe(200);
      // Day 2
      expect(result[1].date).toBe('2023-01-02');

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should apply filters including joins', async () => {
      mockQueryBuilder.then = function (resolve) {
        resolve([]);
      };

      await reportsService.getPaymentsReport({
        fecha_inicio: '2023-01-01',
        fecha_fin: '2023-01-31',
        vendedor_id: 'v1',
        metodo_pago: 'efectivo',
        estatus: 'pagado',
      });

      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'ventas',
        'pagos.venta_id',
        'ventas.id'
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('ventas.vendedor_id', 'v1');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('pagos.metodo_pago', 'efectivo');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('pagos.estatus', 'pagado');
    });
  });

  describe('getKPIsReport', () => {
    it('should return aggregated KPIs', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce({ total: 10000 }) // Total Sales
        .mockResolvedValueOnce({ total: 5000 }) // Total Income
        .mockResolvedValueOnce({ count: 50 }) // Active Clients
        .mockResolvedValueOnce({ total: 2000 }); // Pending Commissions

      const result = await reportsService.getKPIsReport({
        fecha_inicio: '2023-01-01',
        fecha_fin: '2023-01-31',
      });

      expect(result).toEqual({
        total_sales_volume: 10000,
        total_income: 5000,
        active_clients: 50,
        pending_commissions: 2000,
      });
    });

    it('should handle null values in aggregation', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await reportsService.getKPIsReport({
        fecha_inicio: '2023-01-01',
        fecha_fin: '2023-01-31',
      });

      expect(result).toEqual({
        total_sales_volume: 0,
        total_income: 0,
        active_clients: 0,
        pending_commissions: 0,
      });
    });
  });

  describe('getMRRHistory', () => {
    it('should return 6 months history', async () => {
      // getMRR is called 6 times
      mockQueryBuilder.first.mockResolvedValue({ mrr: 1000 });

      const result = await reportsService.getMRRHistory();
      expect(result).toHaveLength(6);
      expect(result[0].mrr).toBe(1000);
    });
  });

  describe('getRevenueByPlan', () => {
    it('should breakdown revenue by plan (amount)', async () => {
      const mockData = [
        { monto: 100, total: 500 },
        { monto: 200, total: 1000 },
      ];

      mockQueryBuilder.then = function (resolve) {
        resolve(mockData);
      };

      const result = await reportsService.getRevenueByPlan('2023-01-01', '2023-01-31');

      expect(result.total_revenue).toBe(1500);
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0].plan).toBe('Plan $100');
    });
  });

  describe('getDashboardMetrics', () => {
    it('should aggregate all metrics', async () => {
      // Mock all sub-calls or let them run with mocked db
      // It's easier to mock the sub-methods if we want unit isolation,
      // but since we are testing the service class, we can just let mocked db return default values.

      // We need to ensure all db calls in sub-methods return valid structures.
      // This might be tricky with a single mockQueryBuilder if they interfere.
      // But they are sequential or parallel promises.

      // Mocking methods on the instance is safer for this specific test.
      vi.spyOn(reportsService, 'getSubscriptionMetrics').mockResolvedValue({});
      vi.spyOn(reportsService, 'getMRR').mockResolvedValue({});
      vi.spyOn(reportsService, 'getChurnRate').mockResolvedValue({});
      vi.spyOn(reportsService, 'getRevenueByPlan').mockResolvedValue({});
      vi.spyOn(reportsService, 'getRefundMetrics').mockResolvedValue({});
      vi.spyOn(reportsService, 'getPaymentFailureRate').mockResolvedValue({});
      vi.spyOn(reportsService, 'getMRRHistory').mockResolvedValue([]);
      vi.spyOn(reportsService, 'getRevenueForecast').mockResolvedValue([]);

      const result = await reportsService.getDashboardMetrics('2023-01-01', '2023-01-31');

      expect(result).toHaveProperty('subscriptions');
      expect(result).toHaveProperty('mrr');
      expect(result).toHaveProperty('revenue_forecast');
    });
  });
});

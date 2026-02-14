import { ReportsService } from '../../../../extensions/endpoint-pagos/src/reports-service.js';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Mock external libraries (Root)
jest.mock('exceljs', () => {
  return {
    __esModule: true,
    default: {
      Workbook: jest.fn(),
    },
  };
});

jest.mock('jspdf', () => {
  return {
    __esModule: true,
    jsPDF: jest.fn(),
  };
});

jest.mock('jspdf-autotable', () => jest.fn());

// Mock external libraries (Extension-specific)
// This is necessary because the extension has its own node_modules
jest.mock('../../../../extensions/endpoint-pagos/node_modules/exceljs', () => {
  return {
    __esModule: true,
    default: {
      Workbook: jest.fn(),
    },
  };
});

jest.mock('../../../../extensions/endpoint-pagos/node_modules/jspdf', () => {
  return {
    __esModule: true,
    jsPDF: jest.fn(),
  };
});

// Import Extension mocks to assert on them
import ExtensionExcelJS from '../../../../extensions/endpoint-pagos/node_modules/exceljs';
import { jsPDF as ExtensionJsPDF } from '../../../../extensions/endpoint-pagos/node_modules/jspdf';

describe('ReportsService', () => {
  let reportsService;
  let mockItemsService;
  let mockDatabase;
  let mockSchema;
  let mockPagosService;
  let mockQueryBuilder;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup ExcelJS mock implementation (Both root and extension)
    const excelMockImpl = () => ({
      addWorksheet: jest.fn().mockReturnValue({
        columns: [],
        addRows: jest.fn(),
      }),
      xlsx: {
        writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel-buffer')),
      },
    });

    ExcelJS.Workbook.mockImplementation(excelMockImpl);
    if (ExtensionExcelJS.default && ExtensionExcelJS.default.Workbook) {
      ExtensionExcelJS.default.Workbook.mockImplementation(excelMockImpl);
    } else if (ExtensionExcelJS.Workbook) {
      ExtensionExcelJS.Workbook.mockImplementation(excelMockImpl);
    }

    // Setup jsPDF mock implementation (Both root and extension)
    const jsPDFMockImpl = () => ({
      text: jest.fn(),
      autoTable: jest.fn(),
      output: jest.fn().mockReturnValue(new ArrayBuffer(8)),
    });

    jsPDF.mockImplementation(jsPDFMockImpl);
    ExtensionJsPDF.mockImplementation(jsPDFMockImpl);

    // Setup Database Query Builder Mock
    mockQueryBuilder = {
      count: jest.fn().mockReturnThis(),
      sum: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereBetween: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      groupByRaw: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      orderByRaw: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      first: jest.fn(),
      then: jest.fn(),
      map: jest.fn(),
    };

    // Allows awaiting the builder directly
    mockQueryBuilder.then.mockImplementation(function (resolve) {
      // Default resolution if not overridden
      resolve([]);
    });

    mockDatabase = jest.fn(() => mockQueryBuilder);
    mockDatabase.raw = jest.fn((str) => str);

    // Mock Directus Services
    mockPagosService = {
      readByQuery: jest.fn(),
    };

    mockItemsService = jest.fn((collection) => {
      if (collection === 'pagos') return mockPagosService;
      return {};
    });

    const mockServices = {
      ItemsService: mockItemsService,
    };

    mockSchema = {};

    reportsService = new ReportsService({
      services: mockServices,
      database: mockDatabase,
      getSchema: jest.fn().mockResolvedValue(mockSchema),
    });
  });

  describe('generateIncomeReport', () => {
    const reportParams = {
      fecha_inicio: '2023-01-01',
      fecha_fin: '2023-01-31',
    };

    test('should generate JSON report by default', async () => {
      mockPagosService.readByQuery.mockResolvedValue([
        { fecha_pago: '2023-01-01', monto_pagado: 100 },
        { fecha_pago: '2023-01-02', monto_pagado: 200 },
      ]);

      const result = await reportsService.generateIncomeReport(reportParams);

      expect(result).toHaveLength(2);
      expect(result[0].total).toBe(100);
      expect(result[1].total).toBe(200);
    });

    test('should generate Excel report', async () => {
      mockPagosService.readByQuery.mockResolvedValue([]);
      const result = await reportsService.generateIncomeReport({
        ...reportParams,
        formato: 'excel',
      });
      expect(Buffer.isBuffer(result)).toBe(true);

      // Check if either root or extension mock was called
      const rootCalled = ExcelJS.Workbook.mock.calls.length > 0;
      const extCalled =
        ExtensionExcelJS.default?.Workbook?.mock?.calls?.length > 0 ||
        ExtensionExcelJS.Workbook?.mock?.calls?.length > 0;

      if (!rootCalled && !extCalled) {
        console.error('ExcelJS Workbook not called on any mock!');
        console.error('Root calls:', ExcelJS.Workbook.mock.calls.length);
        console.error(
          'Extension calls (default):',
          ExtensionExcelJS.default?.Workbook?.mock?.calls?.length
        );
        console.error('Extension calls (direct):', ExtensionExcelJS.Workbook?.mock?.calls?.length);
      }

      expect(rootCalled || extCalled).toBe(true);
    });

    test('should generate PDF report', async () => {
      mockPagosService.readByQuery.mockResolvedValue([]);
      const result = await reportsService.generateIncomeReport({ ...reportParams, formato: 'pdf' });
      expect(Buffer.isBuffer(result)).toBe(true);

      const rootCalled = jsPDF.mock.calls.length > 0;
      const extCalled = ExtensionJsPDF.mock.calls.length > 0;

      expect(rootCalled || extCalled).toBe(true);
    });

    test('should group by month', async () => {
      mockPagosService.readByQuery.mockResolvedValue([
        { fecha_pago: '2023-01-15', monto_pagado: 100 },
        { fecha_pago: '2023-01-20', monto_pagado: 200 },
      ]);
      const result = await reportsService.generateIncomeReport({
        ...reportParams,
        agrupacion: 'mes',
      });
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2023-01');
      expect(result[0].total).toBe(300);
    });
  });

  describe('getSubscriptionMetrics', () => {
    test('should return metrics', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce({ count: 10 }) // new
        .mockResolvedValueOnce({ count: 5 }) // canceled
        .mockResolvedValueOnce({ count: 100 }); // active

      const result = await reportsService.getSubscriptionMetrics('2023-01-01', '2023-01-31');

      expect(result).toEqual({
        new_subscriptions: 10,
        canceled_subscriptions: 5,
        total_active: 100,
      });
      expect(mockDatabase).toHaveBeenCalledTimes(3);
    });
  });

  describe('getRevenueByPlan', () => {
    test('should return revenue breakdown', async () => {
      mockQueryBuilder.then.mockImplementation((resolve) =>
        resolve([
          { monto: 100, total: 1000 },
          { monto: 200, total: 2000 },
        ])
      );

      const result = await reportsService.getRevenueByPlan('2023-01-01', '2023-01-31');

      expect(result.total_revenue).toBe(3000);
      expect(result.breakdown).toHaveLength(2);
    });
  });

  describe('getMRRHistory', () => {
    test('should return history', async () => {
      mockQueryBuilder.first.mockResolvedValue({ mrr: 1000 });

      const result = await reportsService.getMRRHistory();

      expect(result).toHaveLength(6);
      expect(result[0].mrr).toBe(1000);
    });
  });

  describe('getDashboardMetrics', () => {
    test('should return all metrics', async () => {
      jest.spyOn(reportsService, 'getSubscriptionMetrics').mockResolvedValue({});
      jest.spyOn(reportsService, 'getMRR').mockResolvedValue({});
      jest.spyOn(reportsService, 'getChurnRate').mockResolvedValue({});
      jest.spyOn(reportsService, 'getRevenueByPlan').mockResolvedValue({});
      jest.spyOn(reportsService, 'getRefundMetrics').mockResolvedValue({});
      jest.spyOn(reportsService, 'getPaymentFailureRate').mockResolvedValue({});
      jest.spyOn(reportsService, 'getMRRHistory').mockResolvedValue([]);
      jest.spyOn(reportsService, 'getRevenueForecast').mockResolvedValue([]);

      const result = await reportsService.getDashboardMetrics('2023-01-01', '2023-01-31');

      expect(result).toHaveProperty('subscriptions');
      expect(result).toHaveProperty('mrr');
      expect(result).toHaveProperty('revenue_forecast');
    });
  });

  describe('getChurnRate', () => {
    test('should calculate churn rate', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce({ count: 100 }) // startSubs
        .mockResolvedValueOnce({ count: 5 }); // canceled

      const result = await reportsService.getChurnRate('2023-01-01', '2023-01-31');

      expect(result.churn_rate).toBe(5);
      expect(result.start_count).toBe(100);
    });
  });

  describe('getARPU', () => {
    test('should calculate ARPU', async () => {
      mockQueryBuilder.first.mockResolvedValueOnce({ mrr: 1000 });
      mockQueryBuilder.first.mockResolvedValueOnce({ count: 10 });

      const result = await reportsService.getARPU();

      expect(result.arpu).toBe(100);
    });
  });

  describe('getRefundMetrics', () => {
    test('should return refund metrics', async () => {
      mockQueryBuilder.first.mockResolvedValue({ count: 5, total: 500 });
      const result = await reportsService.getRefundMetrics('2023-01-01', '2023-01-31');
      expect(result.refund_count).toBe(5);
      expect(result.refund_amount).toBe(500);
    });
  });

  describe('getPaymentFailureRate', () => {
    test('should calculate failure rate', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce({ count: 100 }) // total
        .mockResolvedValueOnce({ count: 10 }); // failed

      const result = await reportsService.getPaymentFailureRate('2023-01-01', '2023-01-31');
      expect(result.failure_rate).toBe(10);
    });
  });

  describe('getRevenueForecast', () => {
    test('should return forecast', async () => {
      const mockData = [
        { year: 2023, month: 1, total: 1000 },
        { year: 2023, month: 2, total: 1100 },
        { year: 2023, month: 3, total: 1200 },
      ];

      mockQueryBuilder.then.mockImplementation((resolve) => resolve(mockData));

      const result = await reportsService.getRevenueForecast();

      expect(result).toHaveLength(3);
      expect(result[0].predicted_revenue).toBeGreaterThan(0);
    });
  });
});


import amortizacionEndpoint from '../../../extensions/amortizacion/src/index.js';
import { mockContext } from '../setup';

// Mock express router
const mockRouter = {
  post: jest.fn(),
  get: jest.fn(),
};

// Mock Request & Response
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Amortizacion Endpoint', () => {
  let router;
  let postHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    router = { ...mockRouter };
    amortizacionEndpoint(router);
    
    // Extract handler
    const call = router.post.mock.calls.find(call => call[0] === '/generar');
    if (call) postHandler = call[call.length - 1];
  });

  test('should register POST /generar', () => {
    expect(router.post).toHaveBeenCalledWith('/generar', expect.any(Function));
  });

  test('should return 400 if required fields are missing', () => {
    const req = { body: {} };
    const res = mockRes();
    
    postHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
      errors: expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('Faltan campos') })]) 
    }));
  });

  test('should generate amortization table correctly (standard)', () => {
    const req = { 
      body: {
        monto_total: 100000,
        enganche: 10000,
        plazo_meses: 12,
        tasa_interes: 10, // 10% annual
        fecha_inicio: '2024-01-01'
      }
    };
    const res = mockRes();

    postHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        monto_financiar: 90000,
        plazo_meses: 12,
        tabla_amortizacion: expect.any(Array)
      })
    }));

    // Verify first payment calculation
    // Principal: 90000
    // Rate: 10/100/12 = 0.008333...
    // Payment should be around 7912.43
    const responseData = res.json.mock.calls[0][0].data;
    expect(responseData.tabla_amortizacion).toHaveLength(12);
    expect(parseFloat(responseData.cuota_mensual)).toBeCloseTo(7912.43, 1);
  });

  test('should handle zero interest rate', () => {
    const req = { 
      body: {
        monto_total: 12000,
        enganche: 0,
        plazo_meses: 12,
        tasa_interes: 0
      }
    };
    const res = mockRes();

    postHandler(req, res);

    const responseData = res.json.mock.calls[0][0].data;
    expect(parseFloat(responseData.cuota_mensual)).toBeCloseTo(1000.00, 2);
  });

  test('should use default values for optional fields', () => {
    const req = {
      body: {
        monto_total: 10000,
        plazo_meses: 6
        // enganche missing -> 0
        // tasa_interes missing -> 0
        // fecha_inicio missing -> Date.now()
      }
    };
    const res = mockRes();

    postHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        monto_financiar: 10000,
        tasa_anual: 0,
        plazo_meses: 6
      })
    }));

    const data = res.json.mock.calls[0][0].data;
    expect(parseFloat(data.cuota_mensual)).toBeCloseTo(1666.67, 2);
    
    // Check first payment date format
    expect(data.tabla_amortizacion[0].fecha_pago).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('should handle internal errors (500)', () => {
    // Passing req without body will cause destructuring error
    const req = {}; 
    const res = mockRes();

    postHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      errors: expect.arrayContaining([expect.objectContaining({ message: expect.any(String) })])
    }));
  });
});

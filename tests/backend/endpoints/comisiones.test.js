
import comisionesEndpoint from '../../../extensions/comisiones/src/index.js';
import { mockContext } from '../setup';

// Mock express router
const mockRouter = {
  get: jest.fn(),
  post: jest.fn(),
};

// Mock Request & Response
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Comisiones Endpoint', () => {
  let router;
  let getHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    router = { ...mockRouter };
    comisionesEndpoint(router, mockContext);
    
    // Extract handler
    const call = router.get.mock.calls.find(call => call[0] === '/calcular');
    if (call) getHandler = call[call.length - 1];
  });

  test('should register GET /calcular', () => {
    expect(router.get).toHaveBeenCalledWith('/calcular', expect.any(Function));
  });

  test('should throw 400 if venta_id is missing', async () => {
    const req = { query: {}, accountability: { user: 'admin' } };
    const res = mockRes();
    
    await getHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
      errors: expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('Falta parámetro') })]) 
    }));
  });

  test('should calculate commission correctly', async () => {
    const req = { query: { venta_id: 'v-1' }, accountability: { user: 'admin' } };
    const res = mockRes();
    
    const { ItemsService } = mockContext.services;
    const itemsServiceInstance = new ItemsService();
    
    // Mock Venta
    itemsServiceInstance.readOne
      .mockResolvedValueOnce({ 
        id: 'v-1', 
        monto_total: 100000, 
        vendedor_id: 'vend-1',
        fecha_venta: '2024-01-01'
      })
      // Mock Vendedor
      .mockResolvedValueOnce({
        id: 'vend-1',
        nombre: 'Test',
        apellido_paterno: 'Vendedor',
        comision_porcentaje: 5.0
      });

    await getHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        venta_id: 'v-1',
        vendedor_id: 'vend-1',
        comision_total: 5000 // 5% of 100,000
      })
    }));
  });

  test('should use default values for calculation', async () => {
    const req = { query: { venta_id: 'v-1' }, accountability: { user: 'admin' } };
    const res = mockRes();
    
    const { ItemsService } = mockContext.services;
    const itemsServiceInstance = new ItemsService();
    
    // Mock Venta with no amount
    itemsServiceInstance.readOne
      .mockResolvedValueOnce({ 
        id: 'v-1', 
        monto_total: null, 
        vendedor_id: 'vend-1'
      })
      // Mock Vendedor with no percentage
      .mockResolvedValueOnce({
        id: 'vend-1',
        comision_porcentaje: null
      });

    await getHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        comision_total: 0, // 0 * 5.0 / 100 = 0
        detalles: {
            monto_venta: 0,
            porcentaje_aplicado: 5.0
        }
      })
    }));
  });

  test('should handle missing seller', async () => {
    const req = { query: { venta_id: 'v-1' }, accountability: { user: 'admin' } };
    const res = mockRes();
    
    const { ItemsService } = mockContext.services;
    const itemsServiceInstance = new ItemsService();
    
    // Mock Venta with NO seller
    itemsServiceInstance.readOne.mockResolvedValueOnce({ 
      id: 'v-1', 
      monto_total: 100000, 
      vendedor_id: null 
    });

    await getHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
      errors: expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('no tiene vendedor asignado') })]) 
    }));
  });

  test('should return 404 if venta not found', async () => {
    const req = { query: { venta_id: 'v-99' }, accountability: { user: 'admin' } };
    const res = mockRes();
    
    const { ItemsService } = mockContext.services;
    const itemsServiceInstance = new ItemsService();
    
    // Mock Venta null
    itemsServiceInstance.readOne.mockResolvedValueOnce(null);

    await getHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
      errors: expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('Venta v-99 no encontrada') })]) 
    }));
  });

  test('should return 404 if vendedor not found', async () => {
    const req = { query: { venta_id: 'v-1' }, accountability: { user: 'admin' } };
    const res = mockRes();
    
    const { ItemsService } = mockContext.services;
    const itemsServiceInstance = new ItemsService();
    
    // Mock Venta
    itemsServiceInstance.readOne
      .mockResolvedValueOnce({ 
        id: 'v-1', 
        monto_total: 100000, 
        vendedor_id: 'vend-99'
      })
      // Mock Vendedor null
      .mockResolvedValueOnce(null);

    await getHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
      errors: expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('Vendedor vend-99 no encontrado') })]) 
    }));
  });

  test('should handle database errors', async () => {
    const req = { query: { venta_id: 'v-1' }, accountability: { user: 'admin' } };
    const res = mockRes();
    
    const { ItemsService } = mockContext.services;
    const itemsServiceInstance = new ItemsService();
    
    itemsServiceInstance.readOne.mockRejectedValue(new Error('DB Connection Error'));

    await getHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
      errors: expect.arrayContaining([expect.objectContaining({ message: 'DB Connection Error' })]) 
    }));
  });
});

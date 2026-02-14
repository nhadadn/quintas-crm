const { RefundService } = require('../../../../extensions/endpoint-pagos/src/refund-service.js');
const stripeService = require('../../../../extensions/endpoint-pagos/src/stripe-service.js');

jest.mock('../../../../extensions/endpoint-pagos/src/stripe-service.js', () => ({
  createRefund: jest.fn(),
}));

describe('RefundService', () => {
  let refundService;
  let mockItemsService;
  let mockMailService;
  let mockDatabase;
  let mockSchema;
  let mockAccountability;
  let mockPagosService;
  let mockReembolsosService;
  let mockUsersService;

  beforeEach(() => {
    mockPagosService = {
      readOne: jest.fn(),
      readByQuery: jest.fn(),
    };

    mockReembolsosService = {
      createOne: jest.fn(),
      readOne: jest.fn(),
      updateOne: jest.fn(),
      readByQuery: jest.fn(),
    };

    mockUsersService = {
      readOne: jest.fn(),
    };

    mockItemsService = jest.fn((collection) => {
      if (collection === 'pagos') return mockPagosService;
      if (collection === 'reembolsos') return mockReembolsosService;
      if (collection === 'directus_users') return mockUsersService;
      return {};
    });

    mockMailService = {
      send: jest.fn().mockResolvedValue(true),
    };

    const mockServices = {
      ItemsService: mockItemsService,
      MailService: jest.fn(() => mockMailService),
    };

    mockDatabase = jest.fn();
    mockSchema = {};
    mockAccountability = { user: 'test-user-id' };

    refundService = new RefundService({
      services: mockServices,
      database: mockDatabase,
      accountability: mockAccountability,
      getSchema: jest.fn().mockResolvedValue(mockSchema),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestRefund', () => {
    const refundData = {
      pago_id: 'pago-123',
      monto: 100,
      razon: 'duplicate',
      solicitado_por: 'user-123',
    };

    test('should request refund successfully', async () => {
      mockPagosService.readOne.mockResolvedValue({ id: 'pago-123', monto_pagado: 1000 });
      mockReembolsosService.createOne.mockResolvedValue('reembolso-123');
      mockUsersService.readOne.mockResolvedValue({ email: 'user@example.com', first_name: 'Test' });

      const result = await refundService.requestRefund(refundData);

      expect(result).toBe('reembolso-123');
      expect(mockPagosService.readOne).toHaveBeenCalledWith('pago-123');
      expect(mockReembolsosService.createOne).toHaveBeenCalledWith(
        expect.objectContaining({
          pago_id: 'pago-123',
          monto_reembolsado: 100,
          estado: 'pendiente',
        })
      );
      expect(mockMailService.send).toHaveBeenCalled();
    });

    test('should throw error if pago not found', async () => {
      mockPagosService.readOne.mockResolvedValue(null);

      await expect(refundService.requestRefund(refundData)).rejects.toThrow('Pago no encontrado');
    });

    test('should throw error if amount exceeds paid amount', async () => {
      mockPagosService.readOne.mockResolvedValue({ id: 'pago-123', monto_pagado: 50 });

      await expect(refundService.requestRefund(refundData)).rejects.toThrow(
        'Monto excede lo pagado'
      );
    });
  });

  describe('approveRefund', () => {
    const refundId = 'reembolso-123';
    const adminId = 'admin-123';

    test('should approve refund successfully', async () => {
      mockReembolsosService.readOne.mockResolvedValue({
        id: refundId,
        estado: 'pendiente',
        monto_reembolsado: 100,
        solicitado_por: 'user-123',
        pago_id: { id: 'pago-123', referencia: 'pi_123456789' },
      });

      mockUsersService.readOne.mockResolvedValue({ email: 'user@example.com', first_name: 'Test' });
      stripeService.createRefund.mockResolvedValue({ id: 're_123' });

      const result = await refundService.approveRefund(refundId, adminId);

      expect(result).toEqual({ status: 'approved' });
      expect(stripeService.createRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentIntentId: 'pi_123456789',
          amount: 100,
        })
      );
      expect(mockReembolsosService.updateOne).toHaveBeenCalledWith(
        refundId,
        expect.objectContaining({
          estado: 'aprobado',
          aprobado_por: adminId,
        })
      );
      expect(mockMailService.send).toHaveBeenCalled();
    });

    test('should throw error if refund not found', async () => {
      mockReembolsosService.readOne.mockResolvedValue(null);

      await expect(refundService.approveRefund(refundId, adminId)).rejects.toThrow(
        'Reembolso no encontrado'
      );
    });

    test('should throw error if refund not pending', async () => {
      mockReembolsosService.readOne.mockResolvedValue({ id: refundId, estado: 'aprobado' });

      await expect(refundService.approveRefund(refundId, adminId)).rejects.toThrow(
        'El reembolso no está pendiente'
      );
    });

    test('should throw error if payment intent is invalid', async () => {
      mockReembolsosService.readOne.mockResolvedValue({
        id: refundId,
        estado: 'pendiente',
        monto_reembolsado: 100,
        pago_id: { id: 'pago-123', referencia: 'invalid_ref' },
      });

      await expect(refundService.approveRefund(refundId, adminId)).rejects.toThrow(
        'No se encontró un PaymentIntent válido en la referencia del pago'
      );
    });
  });

  describe('rejectRefund', () => {
    const refundId = 'reembolso-123';
    const adminId = 'admin-123';
    const reason = 'Invalid request';

    test('should reject refund successfully', async () => {
      mockReembolsosService.readOne.mockResolvedValue({
        id: refundId,
        estado: 'pendiente',
        solicitado_por: 'user-123',
      });
      mockUsersService.readOne.mockResolvedValue({ email: 'user@example.com', first_name: 'Test' });

      const result = await refundService.rejectRefund(refundId, adminId, reason);

      expect(result).toEqual({ status: 'rejected' });
      expect(mockReembolsosService.updateOne).toHaveBeenCalledWith(
        refundId,
        expect.objectContaining({
          estado: 'rechazado',
          rechazado_por: adminId,
          notas: reason,
        })
      );
      expect(mockMailService.send).toHaveBeenCalled();
    });

    test('should throw error if refund not found', async () => {
      mockReembolsosService.readOne.mockResolvedValue(null);

      await expect(refundService.rejectRefund(refundId, adminId, reason)).rejects.toThrow(
        'Reembolso no encontrado'
      );
    });
  });

  describe('retrieveRefund', () => {
    test('should retrieve refund', async () => {
      mockReembolsosService.readOne.mockResolvedValue({ id: 'reembolso-123' });
      const result = await refundService.retrieveRefund('reembolso-123');
      expect(result).toEqual({ id: 'reembolso-123' });
    });
  });

  describe('listRefunds', () => {
    test('should list refunds with filters', async () => {
      mockReembolsosService.readByQuery.mockResolvedValue([{ id: 'reembolso-123' }]);
      const result = await refundService.listRefunds('user-123', 'pendiente');
      expect(result).toHaveLength(1);
      expect(mockReembolsosService.readByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: {
            solicitado_por: { _eq: 'user-123' },
            estado: { _eq: 'pendiente' },
          },
        })
      );
    });
  });

  describe('processRefundStripe Error Handling', () => {
    test('should handle stripe error', async () => {
      mockReembolsosService.readOne.mockResolvedValue({
        id: 'reembolso-123',
        estado: 'pendiente',
        monto_reembolsado: 100,
        pago_id: { id: 'pago-123', referencia: 'pi_123' },
      });

      stripeService.createRefund.mockRejectedValue(new Error('Stripe Error'));

      await expect(refundService.processRefundStripe('reembolso-123')).rejects.toThrow(
        'Stripe Error'
      );

      expect(mockReembolsosService.updateOne).toHaveBeenCalledWith(
        'reembolso-123',
        expect.objectContaining({
          estado: 'fallido',
          notas: expect.stringContaining('Stripe Error'),
        })
      );
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefundService } from '../src/refund-service.js';
import * as stripeService from '../src/stripe-service.js';

// Mock stripe-service
vi.mock('../src/stripe-service.js', () => ({
  createRefund: vi.fn(),
}));

describe('RefundService', () => {
  let refundService;
  let mockItemsService;
  let mockMailService;
  let mockDatabase;
  let mockAccountability;
  let mockGetSchema;
  let mockServices;

  // Mock instances for different collections
  let mockPagosService;
  let mockReembolsosService;
  let mockUsersService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock services for ItemsService
    mockPagosService = {
      readOne: vi.fn(),
      createOne: vi.fn(),
      updateOne: vi.fn(),
    };
    mockReembolsosService = {
      readOne: vi.fn(),
      createOne: vi.fn(),
      updateOne: vi.fn(),
      readByQuery: vi.fn(),
    };
    mockUsersService = {
      readOne: vi.fn(),
    };

    // Mock ItemsService constructor
    mockItemsService = vi.fn(function (collection) {
      if (collection === 'pagos') return mockPagosService;
      if (collection === 'reembolsos') return mockReembolsosService;
      if (collection === 'directus_users') return mockUsersService;
      return {};
    });

    // Mock MailService
    mockMailService = {
      send: vi.fn().mockResolvedValue(true),
    };

    mockServices = {
      ItemsService: mockItemsService,
      MailService: vi.fn(function () {
        return mockMailService;
      }),
    };

    mockDatabase = {};
    mockAccountability = { user: 'test-user-id' };
    mockGetSchema = vi.fn().mockResolvedValue({});

    refundService = new RefundService({
      services: mockServices,
      database: mockDatabase,
      accountability: mockAccountability,
      getSchema: mockGetSchema,
    });
  });

  describe('requestRefund', () => {
    it('should create a refund request successfully', async () => {
      const data = {
        pago_id: 1,
        monto: 100,
        razon: 'Test reason',
        solicitado_por: 'user-1',
      };

      mockPagosService.readOne.mockResolvedValue({
        id: 1,
        monto_pagado: 200,
      });
      mockReembolsosService.createOne.mockResolvedValue(10);
      mockUsersService.readOne.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        first_name: 'Test',
      });

      const result = await refundService.requestRefund(data);

      expect(result).toBe(10);
      expect(mockPagosService.readOne).toHaveBeenCalledWith(1);
      expect(mockReembolsosService.createOne).toHaveBeenCalledWith(
        expect.objectContaining({
          pago_id: 1,
          monto_reembolsado: 100,
          estado: 'pendiente',
        })
      );
      expect(mockMailService.send).toHaveBeenCalled();
    });

    it('should throw error if payment not found', async () => {
      mockPagosService.readOne.mockResolvedValue(null);

      await expect(refundService.requestRefund({ pago_id: 1 })).rejects.toThrow(
        'Pago no encontrado'
      );
    });

    it('should throw error if amount exceeds paid amount', async () => {
      mockPagosService.readOne.mockResolvedValue({
        id: 1,
        monto_pagado: 50,
      });

      await expect(refundService.requestRefund({ pago_id: 1, monto: 100 })).rejects.toThrow(
        'Monto excede lo pagado'
      );
    });

    it('should treat missing monto_pagado as 0', async () => {
      mockPagosService.readOne.mockResolvedValue({
        id: 1,
        monto_pagado: null,
      });

      await expect(refundService.requestRefund({ pago_id: 1, monto: 1 })).rejects.toThrow(
        'Monto excede lo pagado'
      );
    });

    it('should not send email if solicitado_por is missing', async () => {
      const data = { pago_id: 1, monto: 100, razon: 'Test' };
      mockPagosService.readOne.mockResolvedValue({ id: 1, monto_pagado: 200 });
      mockReembolsosService.createOne.mockResolvedValue(10);

      await refundService.requestRefund(data);
      expect(mockMailService.send).not.toHaveBeenCalled();
    });
  });

  describe('approveRefund', () => {
    it('should approve refund successfully', async () => {
      const refundId = 10;
      const approverId = 'admin-1';

      // Mock reembolso fetch
      mockReembolsosService.readOne.mockResolvedValue({
        id: refundId,
        estado: 'pendiente',
        monto_reembolsado: 100,
        solicitado_por: 'user-1',
        pago_id: { referencia: 'pi_test_123', id: 1 },
      });

      // Mock user fetch for email
      mockUsersService.readOne.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        first_name: 'Test',
      });

      // Mock stripe creation
      stripeService.createRefund.mockResolvedValue({ id: 're_123' });

      const result = await refundService.approveRefund(refundId, approverId);

      expect(result).toEqual({ status: 'approved' });
      expect(stripeService.createRefund).toHaveBeenCalled();
      expect(mockReembolsosService.updateOne).toHaveBeenCalledWith(
        refundId,
        expect.objectContaining({
          estado: 'aprobado',
          aprobado_por: approverId,
        })
      );
      expect(mockMailService.send).toHaveBeenCalled();
    });

    it('should throw error if refund not found', async () => {
      mockReembolsosService.readOne.mockResolvedValue(null);
      await expect(refundService.approveRefund(1, 'admin')).rejects.toThrow(
        'Reembolso no encontrado'
      );
    });

    it('should throw error if refund not pending', async () => {
      mockReembolsosService.readOne.mockResolvedValue({ id: 1, estado: 'aprobado' });
      await expect(refundService.approveRefund(1, 'admin')).rejects.toThrow(
        'El reembolso no está pendiente'
      );
    });

    it('should not send email if solicitado_por is missing in refund', async () => {
      mockReembolsosService.readOne.mockResolvedValue({
        id: 1,
        estado: 'pendiente',
        monto_reembolsado: 100,
        solicitado_por: null,
        pago_id: { referencia: 'pi_123' },
      });
      stripeService.createRefund.mockResolvedValue({ id: 're_123' });

      await refundService.approveRefund(1, 'admin');
      expect(mockMailService.send).not.toHaveBeenCalled();
    });
  });

  describe('rejectRefund', () => {
    const refundId = 1;

    it('should reject refund successfully', async () => {
      mockReembolsosService.readOne.mockResolvedValue({
        id: refundId,
        estado: 'pendiente',
        solicitado_por: 'user-1',
      });
      mockUsersService.readOne.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      });

      const result = await refundService.rejectRefund(refundId, 'admin-1', 'Reason');

      expect(result).toEqual({ status: 'rejected' });
      expect(mockReembolsosService.updateOne).toHaveBeenCalledWith(
        refundId,
        expect.objectContaining({
          estado: 'rechazado',
          notas: 'Reason',
        })
      );
      expect(mockMailService.send).toHaveBeenCalled();
    });

    it('should throw error if refund not found', async () => {
      mockReembolsosService.readOne.mockResolvedValue(null);
      await expect(refundService.rejectRefund(999, 'admin', 'reason')).rejects.toThrow(
        'Reembolso no encontrado'
      );
    });

    it('should throw error if refund not pending', async () => {
      mockReembolsosService.readOne.mockResolvedValue({ id: 1, estado: 'aprobado' });
      await expect(refundService.rejectRefund(1, 'admin', 'reason')).rejects.toThrow(
        'El reembolso no está pendiente'
      );
    });

    it('should not send email if solicitado_por is missing in rejected refund', async () => {
      mockReembolsosService.readOne.mockResolvedValue({
        id: 1,
        estado: 'pendiente',
        solicitado_por: null,
      });

      await refundService.rejectRefund(1, 'admin', 'Reason');
      expect(mockMailService.send).not.toHaveBeenCalled();
    });
  });

  describe('processRefundStripe', () => {
    it('should throw error if invalid payment intent', async () => {
      mockReembolsosService.readOne.mockResolvedValue({
        id: 1,
        pago_id: { referencia: 'invalid_ref' },
      });

      await expect(refundService.processRefundStripe(1)).rejects.toThrow(
        'No se encontró un PaymentIntent válido'
      );
    });

    it('should handle stripe error and update status to failed', async () => {
      mockReembolsosService.readOne.mockResolvedValue({
        id: 1,
        monto_reembolsado: 100,
        pago_id: { referencia: 'pi_test_123' },
      });

      stripeService.createRefund.mockRejectedValue(new Error('Stripe Error'));

      await expect(refundService.processRefundStripe(1)).rejects.toThrow('Stripe Error');

      expect(mockReembolsosService.updateOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          estado: 'fallido',
          notas: expect.stringContaining('Stripe Error'),
        })
      );
    });
  });

  describe('sendEmail', () => {
    it('should not send email if user not found', async () => {
      mockUsersService.readOne.mockResolvedValue(null);
      await refundService.sendEmail('unknown', 'Subject', 'tpl', {}, {});
      expect(mockMailService.send).not.toHaveBeenCalled();
    });

    it('should catch errors during email sending', async () => {
      mockUsersService.readOne.mockResolvedValue({ email: 'test@example.com' });
      mockMailService.send.mockRejectedValue(new Error('Mail Error'));

      // Should not throw
      await refundService.sendEmail('user', 'Subject', 'tpl', {}, {});
      // Check console.error was called? (Optional, difficult to spy on console in some setups, but ensure it doesn't crash)
    });
  });

  describe('listRefunds', () => {
    it('should list refunds with filters', async () => {
      mockReembolsosService.readByQuery.mockResolvedValue([]);
      await refundService.listRefunds('user-1', 'pendiente');
      expect(mockReembolsosService.readByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: {
            solicitado_por: { _eq: 'user-1' },
            estado: { _eq: 'pendiente' },
          },
        })
      );
    });

    it('should list all refunds if no filters', async () => {
      mockReembolsosService.readByQuery.mockResolvedValue([]);
      await refundService.listRefunds();
      expect(mockReembolsosService.readByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: {},
        })
      );
    });
  });

  describe('retrieveRefund', () => {
    it('should retrieve a single refund', async () => {
      mockReembolsosService.readOne.mockResolvedValue({ id: 1 });
      const result = await refundService.retrieveRefund(1);
      expect(result).toEqual({ id: 1 });
      expect(mockReembolsosService.readOne).toHaveBeenCalledWith(1);
    });
  });
});

const {
  createSubscriptionSchema,
  changePlanSchema,
  refundSchema,
  refundApprovalSchema,
  rejectRefundSchema,
  reportSchema,
  createPaymentIntentSchema,
} = require('../../../../extensions/endpoint-pagos/src/validators.js');

describe('Validators', () => {
  describe('createSubscriptionSchema', () => {
    test('should validate correct data', () => {
      const data = {
        cliente_id: '123e4567-e89b-12d3-a456-426614174000',
        venta_id: '123e4567-e89b-12d3-a456-426614174001',
        plan_id: '123e4567-e89b-12d3-a456-426614174002',
      };
      expect(createSubscriptionSchema.parse(data)).toEqual(data);
    });

    test('should fail with invalid UUID', () => {
      const data = {
        cliente_id: 'invalid-uuid',
        venta_id: '123e4567-e89b-12d3-a456-426614174001',
        plan_id: '123e4567-e89b-12d3-a456-426614174002',
      };
      expect(() => createSubscriptionSchema.parse(data)).toThrow(
        'cliente_id debe ser un UUID válido'
      );
    });
  });

  describe('changePlanSchema', () => {
    test('should validate correct data', () => {
      const data = { plan_id: '123e4567-e89b-12d3-a456-426614174000' };
      expect(changePlanSchema.parse(data)).toEqual(data);
    });

    test('should fail with invalid UUID', () => {
      expect(() => changePlanSchema.parse({ plan_id: 'invalid' })).toThrow(
        'plan_id debe ser un UUID válido'
      );
    });
  });

  describe('refundSchema', () => {
    test('should validate correct data', () => {
      const data = {
        pago_id: '123e4567-e89b-12d3-a456-426614174000',
        monto: 100,
        razon: 'Duplicate payment',
      };
      expect(refundSchema.parse(data)).toEqual(data);
    });

    test('should fail with negative amount', () => {
      const data = {
        pago_id: '123e4567-e89b-12d3-a456-426614174000',
        monto: -10,
        razon: 'Reason',
      };
      expect(() => refundSchema.parse(data)).toThrow('El monto debe ser positivo');
    });
  });

  describe('refundApprovalSchema', () => {
    test('should validate correct data', () => {
      const data = { aprobado: true, notas: 'Approved' };
      expect(refundApprovalSchema.parse(data)).toEqual(data);
    });
  });

  describe('rejectRefundSchema', () => {
    test('should validate correct data', () => {
      const data = { motivo: 'Invalid request' };
      expect(rejectRefundSchema.parse(data)).toEqual(data);
    });

    test('should fail with short reason', () => {
      expect(() => rejectRefundSchema.parse({ motivo: 'bad' })).toThrow(
        'El motivo de rechazo debe tener al menos 5 caracteres'
      );
    });
  });

  describe('reportSchema', () => {
    test('should validate correct data', () => {
      const data = {
        fecha_inicio: '2023-01-01',
        fecha_fin: '2023-01-31',
        agrupacion: 'mes',
        formato: 'json',
      };
      expect(reportSchema.parse(data)).toEqual({
        ...data,
        limit: 100,
        page: 1,
      });
    });

    test('should fail with invalid date format', () => {
      const data = {
        fecha_inicio: '01-01-2023',
        fecha_fin: '2023-01-31',
      };
      expect(() => reportSchema.parse(data)).toThrow('Formato de fecha inválido');
    });
  });

  describe('createPaymentIntentSchema', () => {
    test('should validate with pago_id', () => {
      const data = {
        pago_id: '123',
        cliente_id: '456',
      };
      expect(createPaymentIntentSchema.parse(data)).toEqual(data);
    });

    test('should validate with venta_id and numero_pago', () => {
      const data = {
        venta_id: '123',
        numero_pago: 1,
        cliente_id: '456',
      };
      expect(createPaymentIntentSchema.parse(data)).toEqual(data);
    });

    test('should fail without pago_id or venta_id/numero_pago', () => {
      const data = {
        cliente_id: '456',
      };
      expect(() => createPaymentIntentSchema.parse(data)).toThrow(
        'Debe proporcionar pago_id O (venta_id Y numero_pago)'
      );
    });
  });
});

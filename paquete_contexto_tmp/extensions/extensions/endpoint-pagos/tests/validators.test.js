import { describe, it, expect } from 'vitest';
import { registerPaymentSchema } from '../src/validators.js';

describe('registerPaymentSchema', () => {
  it('validates a correct payment payload', () => {
    const payload = {
      venta_id: '123e4567-e89b-12d3-a456-426614174000',
      monto: 1500.5,
      metodo_pago: 'efectivo',
      notas: 'Pago de mensualidad',
    };

    const result = registerPaymentSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('validates a correct payment payload with pago_id only', () => {
    const payload = {
      pago_id: '123e4567-e89b-12d3-a456-426614174000',
      monto: 1500.5,
      metodo_pago: 'efectivo',
      notas: 'Pago de mensualidad',
    };

    const result = registerPaymentSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('fails if neither venta_id nor pago_id provided', () => {
    const payload = {
      monto: 1500.5,
      metodo_pago: 'efectivo',
    };

    const result = registerPaymentSchema.safeParse(payload);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toContain('Debe especificar venta_id o pago_id');
  });

  it('validates a correct payment with reference', () => {
    const payload = {
      venta_id: '123e4567-e89b-12d3-a456-426614174000',
      monto: 1500.5,
      metodo_pago: 'transferencia',
      referencia: 'REF12345',
      notas: 'Pago de mensualidad',
    };

    const result = registerPaymentSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('fails if monto is negative', () => {
    const payload = {
      venta_id: '123e4567-e89b-12d3-a456-426614174000',
      monto: -100,
      metodo_pago: 'efectivo',
    };

    const result = registerPaymentSchema.safeParse(payload);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toContain('positivo');
  });

  it('fails if monto has more than 2 decimals', () => {
    const payload = {
      venta_id: '123e4567-e89b-12d3-a456-426614174000',
      monto: 100.123,
      metodo_pago: 'efectivo',
    };

    const result = registerPaymentSchema.safeParse(payload);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toContain('máximo 2 decimales');
  });

  it('fails if referencia is missing for transferencia', () => {
    const payload = {
      venta_id: '123e4567-e89b-12d3-a456-426614174000',
      monto: 100,
      metodo_pago: 'transferencia',
    };

    const result = registerPaymentSchema.safeParse(payload);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toContain('referencia es obligatoria');
  });

  it('fails if fecha_pago is in the future', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    const payload = {
      venta_id: '123e4567-e89b-12d3-a456-426614174000',
      monto: 100,
      metodo_pago: 'efectivo',
      fecha_pago: futureDate.toISOString(),
    };

    const result = registerPaymentSchema.safeParse(payload);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toContain('futura');
  });
});

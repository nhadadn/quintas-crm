import { strict as assert } from 'node:assert';
import { describe, it, beforeEach } from 'node:test';
import { createSubscription } from '../extensions/stripe/src/subscription-service.js';

describe('Subscription Service', () => {
  let services, database, schema, accountability, stripe;
  let itemsServiceStub;

  beforeEach(() => {
    // Mock ItemsService
    itemsServiceStub = {
      readOne: async (id) => {
        if (id === 'venta_123')
          return {
            id: 'venta_123',
            cliente_id: 'cliente_456',
            monto_total: 120000,
            enganche: 20000,
          };
        if (id === 'cliente_456')
          return { id: 'cliente_456', email: 'test@test.com', nombre: 'Test', telefono: '123' };
        if (id === 'plan_789') return { id: 'plan_789', tasa_interes: 12, numero_pagos: 12 };
        return null;
      },
      readByQuery: async () => [], // No existing subscriptions
      createOne: async (data) => 'new_sub_id',
      updateOne: async () => {},
      createMany: async (data) => data.map((d) => 'new_row_id'),
    };

    services = {
      ItemsService: function (collection) {
        // Return specific stub or generic one
        if (collection === 'ventas') return itemsServiceStub;
        if (collection === 'clientes') return itemsServiceStub;
        if (collection === 'planes_pagos') return itemsServiceStub;
        if (collection === 'suscripciones')
          return { ...itemsServiceStub, createOne: async () => 'suscripcion_db_id_1' };
        if (collection === 'amortizaciones')
          return {
            ...itemsServiceStub,
            createMany: async (rows) => {
              itemsServiceStub.createdAmortizations = rows;
              return rows;
            },
          };
        return itemsServiceStub;
      },
    };

    database = {};
    schema = {};
    accountability = { user: 'admin' };

    // Mock Stripe
    stripe = {
      customers: {
        create: async () => ({ id: 'cus_test' }),
      },
      prices: {
        create: async () => ({ id: 'price_test' }),
      },
      subscriptions: {
        create: async () => ({
          id: 'sub_test',
          status: 'incomplete',
          start_date: 1600000000,
          latest_invoice: {
            payment_intent: { client_secret: 'pi_secret_test' },
          },
        }),
      },
    };
  });

  it('should create a subscription and generate amortization schedule', async () => {
    const result = await createSubscription(
      { cliente_id: 'cliente_456', venta_id: 'venta_123', plan_id: 'plan_789' },
      { services, database, getSchema: async () => schema, accountability },
      stripe
    );

    assert.equal(result.subscriptionId, 'sub_test');
    assert.equal(result.clientSecret, 'pi_secret_test');
    assert.equal(result.suscripcion_db_id, 'suscripcion_db_id_1');

    // Verify Amortization
    // Principal = 100,000 (120k - 20k)
    // Rate = 12% annual => 1% monthly
    // N = 12
    // Monthly Payment ~ 8884.88

    assert.ok(result.monthlyPayment > 8800 && result.monthlyPayment < 8900);
    assert.equal(itemsServiceStub.createdAmortizations.length, 12);

    const firstRow = itemsServiceStub.createdAmortizations[0];
    assert.equal(firstRow.numero_pago, 1);
    // Fix floating point precision
    const sumCapitalInterest = firstRow.monto_capital + firstRow.monto_interes;
    assert.ok(
      Math.abs(sumCapitalInterest - firstRow.monto_total) < 0.01,
      `Sum ${sumCapitalInterest} should equal total ${firstRow.monto_total}`
    );
    assert.equal(firstRow.suscripcion_id, 'suscripcion_db_id_1');
  });

  it('should throw error if venta not found', async () => {
    itemsServiceStub.readOne = async () => null;
    try {
      await createSubscription(
        { cliente_id: 'c', venta_id: 'v', plan_id: 'p' },
        { services, database, getSchema: async () => schema, accountability },
        stripe
      );
      assert.fail('Should have thrown error');
    } catch (e) {
      assert.equal(e.message, 'Venta no encontrada');
    }
  });

  it('should throw error if subscription already exists', async () => {
    // Mock existing subscription
    services.ItemsService = function (col) {
      if (col === 'suscripciones')
        return {
          ...itemsServiceStub,
          readByQuery: async () => [{ id: 'existing' }],
        };
      return itemsServiceStub;
    };

    try {
      await createSubscription(
        { cliente_id: 'cliente_456', venta_id: 'venta_123', plan_id: 'plan_789' },
        { services, database, getSchema: async () => schema, accountability },
        stripe
      );
      assert.fail('Should have thrown error');
    } catch (e) {
      assert.equal(e.message, 'Ya existe una suscripción activa para esta venta');
    }
  });
});

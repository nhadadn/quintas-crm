import { strict as assert } from 'assert';
import { describe, it } from 'node:test';
import { createSubscription } from '../extensions/stripe/src/subscription-service.js';
import { processEventWithRetry } from '../extensions/stripe/src/webhook-service.js';

// Mocks
const mockItemsService = class {
  constructor(collection) {
    this.collection = collection;
    this.data = [];
    this.createdAmortizations = [];
    this.createdPagos = [];
    this.updatedAmortizations = [];
  }
  async readOne(id) {
    if (this.collection === 'ventas')
      return { id, monto_total: 100000, enganche: 10000, cliente_id: 'cliente_123' };
    if (this.collection === 'clientes')
      return { id, email: 'test@example.com', nombre: 'Test', stripe_customer_id: 'cus_test' };
    if (this.collection === 'planes_pagos') return { id, tasa_interes: 12, numero_pagos: 12 }; // 12% anual, 12 pagos
    return null;
  }
  async readByQuery({ filter, sort }) {
    if (this.collection === 'suscripciones') {
      if (
        filter.stripe_subscription_id &&
        filter.stripe_subscription_id._eq === 'sub_invoice_test'
      ) {
        return [{ id: 'sub_db_1', venta_id: 'venta_123' }];
      }
      return [];
    }
    if (this.collection === 'amortizaciones') {
      if (filter.suscripcion_id && filter.suscripcion_id._eq === 'sub_db_1') {
        // Return a pending amortization
        return [{ id: 'amort_1', numero_pago: 1, estatus: 'pendiente' }];
      }
    }
    return [];
  }
  async createOne(data) {
    if (this.collection === 'pagos') this.createdPagos.push(data);
    return 'new_id_' + this.collection;
  }
  async createMany(data) {
    if (this.collection === 'amortizaciones') {
      this.createdAmortizations.push(...data);
    }
    return data.map((_, i) => 'id_' + i);
  }
  async updateOne(id, data) {
    if (this.collection === 'amortizaciones') {
      this.updatedAmortizations.push({ id, ...data });
    }
    if (this.collection === 'clientes') {
      // update client
    }
    return { id, ...data };
  }
};

const services = {
  ItemsService: mockItemsService,
};

const database = {
  transaction: async () => ({
    commit: async () => {},
    rollback: async () => {},
    insert: async () => {},
    where: () => ({ first: async () => null }),
  }),
};

const stripeMock = {
  customers: { create: async () => ({ id: 'cus_new' }) },
  prices: { create: async () => ({ id: 'price_test' }) },
  subscriptions: {
    create: async () => ({
      id: 'sub_test',
      status: 'active',
      start_date: 1700000000,
      latest_invoice: { payment_intent: { client_secret: 'pi_secret' } },
    }),
  },
};

describe('Amortization & Webhook Logic', () => {
  it('should correctly calculate last payment adjustment in subscription creation', async () => {
    // Setup: 90000 principal, 12 payments, 12% interest
    // Monthly payment should be approx 7995.
    // We want to check the LAST payment (12th).

    const itemsServiceStub = new mockItemsService('amortizaciones');
    services.ItemsService = function (col) {
      if (col === 'amortizaciones') return itemsServiceStub;
      return new mockItemsService(col);
    };

    await createSubscription(
      { cliente_id: 'cliente_123', venta_id: 'venta_123', plan_id: 'plan_123' },
      { services, database, getSchema: async () => ({}), accountability: {} },
      stripeMock
    );

    const amortizations = itemsServiceStub.createdAmortizations;
    assert.equal(amortizations.length, 12);

    const lastPayment = amortizations[11]; // Index 11 is 12th payment
    assert.equal(lastPayment.numero_pago, 12);

    // Calculate expected balance before last payment roughly
    // But mainly we check if capital + interest = total
    const sum = lastPayment.monto_capital + lastPayment.monto_interes;
    assert.ok(
      Math.abs(sum - lastPayment.monto_total) < 0.01,
      `Last payment sum ${sum} should match total ${lastPayment.monto_total}`
    );

    // Ensure interest is non-negative
    assert.ok(lastPayment.monto_interes >= 0);
  });

  it('should update amortization table on invoice.payment_succeeded', async () => {
    const event = {
      id: 'evt_test',
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_test',
          subscription: 'sub_invoice_test',
          amount_paid: 10000,
          status_transitions: { paid_at: 1700000000 },
          payment_intent: 'pi_test',
          customer: 'cus_test',
          number: 'INV-001',
        },
      },
    };

    const itemsServiceStubPagos = new mockItemsService('pagos');
    const itemsServiceStubAmort = new mockItemsService('amortizaciones');

    services.ItemsService = function (col) {
      if (col === 'pagos') return itemsServiceStubPagos;
      if (col === 'amortizaciones') return itemsServiceStubAmort;
      return new mockItemsService(col);
    };

    await processEventWithRetry(event, services, {}, database);

    // Check if payment was created
    assert.equal(itemsServiceStubPagos.createdPagos.length, 1);
    assert.equal(itemsServiceStubPagos.createdPagos[0].estatus, 'pagado');

    // Check if amortization was updated
    assert.equal(itemsServiceStubAmort.updatedAmortizations.length, 1);
    assert.equal(itemsServiceStubAmort.updatedAmortizations[0].id, 'amort_1');
    assert.equal(itemsServiceStubAmort.updatedAmortizations[0].estatus, 'pagado');
    assert.equal(itemsServiceStubAmort.updatedAmortizations[0].pago_id, 'new_id_pagos');
  });
});

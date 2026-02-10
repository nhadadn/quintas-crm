import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { processEventWithRetry } from '../extensions/stripe/src/webhook-service.js';

// Helper for mocks
function createStub() {
  let returnValue;
  let resolveValue;
  let impl;

  const wrapper = function (...args) {
    wrapper.calls.push(args);
    wrapper.called = true;
    wrapper.callCount++;

    if (impl) return impl.apply(this, args);
    if (resolveValue !== undefined) return Promise.resolve(resolveValue);
    return returnValue !== undefined ? returnValue : wrapper;
  };

  wrapper.calls = [];
  wrapper.called = false;
  wrapper.callCount = 0;

  wrapper.calledWith = (...expected) => {
    return wrapper.calls.some((callArgs) =>
      expected.every((arg, i) => JSON.stringify(arg) === JSON.stringify(callArgs[i]))
    );
  };

  wrapper.getCall = (index) => ({ args: wrapper.calls[index] });

  wrapper.returns = (val) => {
    returnValue = val;
    return wrapper;
  };
  wrapper.resolves = (val) => {
    resolveValue = val;
    return wrapper;
  };
  wrapper.callsFake = (fn) => {
    impl = fn;
    return wrapper;
  };

  return wrapper;
}

describe('Stripe Webhook Service Logic Tests', () => {
  let services;
  let schema;
  let database;
  let itemsServiceStub;

  beforeEach(() => {
    // Mock ItemsService instance methods
    itemsServiceStub = {
      readByQuery: createStub().resolves([]),
      updateOne: createStub().resolves({}),
      createOne: createStub().resolves({}),
    };

    // Mock ItemsService Constructor
    const ItemsServiceMock = function (collection, opts) {
      itemsServiceStub.collection = collection; // Store collection to check later if needed
      return itemsServiceStub;
    };

    services = { ItemsService: ItemsServiceMock };
    schema = {};
    database = {}; // Not used in service logic directly except for specific raw queries if any
  });

  it('should handle payment_intent.succeeded', async () => {
    const event = {
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_1',
          customer: 'cus_1',
          charges: { data: [{ payment_method_details: { card: { last4: '4242' } } }] },
        },
      },
    };

    // Setup: Payment exists
    itemsServiceStub.readByQuery.resolves([{ id: 'pago_1', notas: '' }]);

    const result = await processEventWithRetry(event, services, schema, database);

    assert.strictEqual(result.success, true);
    assert.strictEqual(itemsServiceStub.readByQuery.called, true);
    assert.strictEqual(itemsServiceStub.updateOne.called, true);

    const updateArgs = itemsServiceStub.updateOne.getCall(0).args;
    assert.strictEqual(updateArgs[0], 'pago_1');
    assert.strictEqual(updateArgs[1].estatus, 'pagado');
    assert.strictEqual(updateArgs[1].stripe_last4, '4242');
  });

  it('should handle customer.subscription.created (New Subscription)', async () => {
    const event = {
      id: 'evt_2',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_1',
          status: 'incomplete',
          start_date: 1600000000,
          metadata: { venta_id: 'v_1', cliente_id: 'c_1', plan_id: 'p_1' },
        },
      },
    };

    // Setup: Subscription does NOT exist
    itemsServiceStub.readByQuery.resolves([]);

    const result = await processEventWithRetry(event, services, schema, database);

    assert.strictEqual(result.success, true);
    assert.strictEqual(itemsServiceStub.createOne.called, true);

    const createArgs = itemsServiceStub.createOne.getCall(0).args[0];
    assert.strictEqual(createArgs.stripe_subscription_id, 'sub_1');
    assert.strictEqual(createArgs.venta_id, 'v_1');
    assert.strictEqual(createArgs.estado, 'incomplete');
  });

  it('should handle invoice.payment_succeeded (Subscription Renewal)', async () => {
    const event = {
      id: 'evt_3',
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_1',
          subscription: 'sub_1',
          amount_paid: 1000,
          payment_intent: 'pi_2',
          status_transitions: { paid_at: 1600000000 },
          number: 'INV-001',
        },
      },
    };

    // Setup: Subscription exists
    // Note: Logic calls readByQuery for 'suscripciones'
    // If mocked correctly, it should return the sub.
    // But logic creates 'pagos' service too.
    // Our ItemsServiceMock returns SAME stub for all collections.
    // So we need to handle readByQuery returning sub, but createOne being called for pago.

    // This is a limitation of the simple stub.
    // Logic:
    // 1. readByQuery (suscripciones) -> returns [sub]
    // 2. createOne (pagos) -> returns {}

    // We can make readByQuery return [sub] always.
    itemsServiceStub.readByQuery.resolves([
      {
        id: 'sub_db_1',
        venta_id: 'v_1',
        cliente_id: 'c_1',
      },
    ]);

    const result = await processEventWithRetry(event, services, schema, database);

    assert.strictEqual(result.success, true);

    // Verify pago creation
    assert.strictEqual(itemsServiceStub.createOne.called, true);
    const createArgs = itemsServiceStub.createOne.getCall(0).args[0];
    assert.strictEqual(createArgs.venta_id, 'v_1');
    assert.strictEqual(createArgs.monto, 10); // 1000 cents = 10
    assert.strictEqual(createArgs.stripe_payment_intent_id, 'pi_2');
  });

  it('should retry on failure and eventually succeed', async () => {
    const event = {
      id: 'evt_fail',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_x' } },
    };

    // Setup: First call fails, second succeeds
    let attempt = 0;
    itemsServiceStub.readByQuery.callsFake(() => {
      attempt++;
      if (attempt === 1) throw new Error('DB Connection Lost');
      return Promise.resolve([{ id: 'pago_1' }]);
    });

    // Reduce delays for test
    // We can't easily mock the delays array inside the function without dependency injection or rewrite.
    // But 1s delay is acceptable for test or we can mock setTimeout if needed.
    // For this environment, 1s is fine.

    const start = Date.now();
    const result = await processEventWithRetry(event, services, schema, database);
    const duration = Date.now() - start;

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.attempts, 1); // 0 = first attempt (failed), 1 = retry 1 (success)
    assert.ok(duration >= 1000); // Should have waited at least 1s
  });
});

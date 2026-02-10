import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import stripeEndpoint from '../extensions/stripe/src/index.js';

// Mini-Mock Implementation
function createSpy(impl) {
  function spy(...args) {
    spy.calls.push(args);
    spy.called = true;
    spy.callCount++;
    if (impl) return impl(...args);
  }
  spy.calls = [];
  spy.called = false;
  spy.callCount = 0;
  spy.calledWith = (...expected) => {
    return spy.calls.some((callArgs) =>
      expected.every((arg, i) => JSON.stringify(arg) === JSON.stringify(callArgs[i]))
    );
  };
  spy.getCall = (index) => ({ args: spy.calls[index] });
  return spy;
}

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

describe('Stripe Webhook Handler Unit Tests', () => {
  let router;
  let context;
  let req;
  let res;
  let databaseStub;
  let itemsServiceStub;
  let trxStub;

  const WEBHOOK_SECRET = 'whsec_test_secret';
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';

  beforeEach(() => {
    // Mock Router
    router = {
      post: createSpy((path, handler) => {
        router.routes[path] = handler;
      }),
      routes: {},
    };

    // Mock Transaction
    trxStub = createStub();
    trxStub.where = createStub().returns(trxStub);
    trxStub.first = createStub().resolves(null);
    trxStub.insert = createStub().resolves([1]);
    trxStub.update = createStub().resolves(1);
    trxStub.commit = createStub().resolves();
    trxStub.rollback = createStub().resolves();

    const trxCallable = createSpy(async (cb) => {
      if (cb) return await cb(trxStub);
      return trxStub;
    });
    Object.assign(trxCallable, trxStub);

    // Mock Database
    databaseStub = {
      transaction: createStub().callsFake(async (cb) => {
        if (cb) return await cb(trxStub);
        return trxStub;
      }),
      table: createStub().returns(trxStub),
    };
    // Add direct call capability: database('table')
    const databaseCallable = createSpy((table) => {
      return trxStub; // Return query builder/trx mock
    });
    Object.assign(databaseCallable, databaseStub);

    // Mock Services
    itemsServiceStub = {
      readByQuery: createStub().resolves([{ id: 1, notas: '' }]),
      updateOne: createStub().resolves({}),
      createOne: createStub().resolves({}),
    };

    // ItemsService Constructor Mock
    // Must be a function that returns an object
    const ItemsServiceMock = function (collection, opts) {
      return itemsServiceStub;
    };

    context = {
      services: { ItemsService: ItemsServiceMock },
      exceptions: { ServiceUnavailableException: class {}, InvalidPayloadException: class {} },
      database: databaseCallable, // Use the callable wrapper
      getSchema: createStub().resolves({}),
    };

    req = { headers: {}, body: {} };
    res = {
      status: createStub().returns(res),
      send: createStub(),
      json: createStub(),
    };

    stripeEndpoint(router, context);
  });

  function generateSignature(payloadString) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payloadString}`;
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const signature = hmac.update(signedPayload).digest('hex');
    return `t=${timestamp},v1=${signature}`;
  }

  it('should register POST /webhook route', () => {
    assert.strictEqual(router.post.called, true);
    assert.strictEqual(router.post.calls[0][0], '/webhook');
  });

  it('should reject requests with missing signature', async () => {
    const handler = router.routes['/webhook'];
    await handler(req, res);
    assert.strictEqual(res.status.calledWith(400), true);
  });

  it('should process valid payment_intent.succeeded event (Happy Path)', async () => {
    const handler = router.routes['/webhook'];

    const eventData = {
      id: 'evt_test_success',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_123',
          amount: 5000,
          customer: 'cus_123',
          metadata: { venta_id: '100' },
          charges: { data: [{ payment_method_details: { card: { last4: '4242' } } }] },
        },
      },
    };

    const rawBody = JSON.stringify(eventData);
    req.rawBody = rawBody;
    req.body = eventData;
    req.headers['stripe-signature'] = generateSignature(rawBody);

    await handler(req, res);

    // Assert res.json was called (implies success)
    assert.strictEqual(res.json.called, true, 'Should call res.json');
    const jsonArg = res.json.getCall(0).args[0];
    assert.strictEqual(jsonArg.received, true);
    assert.strictEqual(jsonArg.processing, true);

    // Cannot verify async side effects reliably without waiting,
    // but we can check that no immediate error occurred in the synchronous part.
  });

  it('should handle idempotency (duplicate event)', async () => {
    const handler = router.routes['/webhook'];

    // Setup existing log
    trxStub.first = createStub().resolves({ id: 1, stripe_event_id: 'evt_dup', processed: true });
    trxStub.where = createStub().returns({ first: trxStub.first });

    const eventData = { id: 'evt_dup', type: 'payment_intent.succeeded' };
    const rawBody = JSON.stringify(eventData);
    req.rawBody = rawBody;
    req.body = eventData;
    req.headers['stripe-signature'] = generateSignature(rawBody);

    await handler(req, res);

    // Check response
    assert.strictEqual(res.json.called, true);
    const jsonArg = res.json.getCall(0).args[0];
    assert.strictEqual(jsonArg.received, true);
    // Should NOT be processing if already processed
    assert.strictEqual(jsonArg.processing, undefined);

    // Assert ItemsService was NOT instantiated (or updated)
    // Since we can't check if background task didn't run easily, we assume it didn't based on "processing" flag missing in response logic?
    // Wait, line 202: return res.json({ received: true }); -> processing is undefined.
    // Line 240: res.json({ received: true, processing: true });
    // So checking `processing` field is a good way to verify which path was taken.
  });
});

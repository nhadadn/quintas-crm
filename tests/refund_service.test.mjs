import assert from 'assert';
import { processRefund } from '../extensions/stripe/src/payment-service.js';

class MockStripe {
  constructor() {
    this.paymentIntents = {
      retrieve: async (id) => {
        if (id === 'pi_success')
          return { id: 'pi_success', status: 'succeeded', amount: 1000, currency: 'mxn' };
        if (id === 'pi_failed') return { id: 'pi_failed', status: 'requires_payment_method' };
        throw new Error('Not found');
      },
    };
    this.refunds = {
      create: async ({ payment_intent, amount }) => {
        if (amount && amount > 1000) throw new Error('Amount exceeds charge');
        return {
          id: 're_123',
          amount: amount || 1000,
          currency: 'mxn',
          status: 'succeeded',
          created: 1700000000,
          payment_intent,
        };
      },
    };
  }
}

class MockItemsService {
  constructor(collection, context) {
    this.collection = collection;
  }

  async readByQuery({ filter }) {
    if (filter.stripe_payment_intent_id?._eq === 'pi_success') {
      return [{ id: 1, estatus: 'pagado', notas: 'Initial note' }];
    }
    return [];
  }

  async updateOne(id, data) {
    this.lastUpdate = { id, data };
    return { id, ...data };
  }
}

const mockServices = {
  ItemsService: MockItemsService,
};

async function runTests() {
  console.log('--- TEST: Refund Service ---');
  const stripe = new MockStripe();

  // Test 1: Successful Full Refund
  console.log('\n1. Testing Full Refund (Admin)...');
  const result1 = await processRefund(
    stripe,
    mockServices,
    {},
    { admin: true },
    { payment_intent_id: 'pi_success' }
  );
  assert.strictEqual(result1.status, 'succeeded');
  assert.strictEqual(result1.amount, 10); // 1000 cents = 10 units
  console.log('✅ Full Refund Passed');

  // Test 2: Permission Denied
  console.log('\n2. Testing Non-Admin Access...');
  try {
    await processRefund(
      stripe,
      mockServices,
      {},
      { admin: false },
      { payment_intent_id: 'pi_success' }
    );
    assert.fail('Should fail for non-admin');
  } catch (e) {
    assert.match(e.message, /Forbidden/);
    console.log('✅ Permission Check Passed');
  }

  // Test 3: Invalid Payment Status
  console.log('\n3. Testing Invalid Payment Status...');
  try {
    await processRefund(
      stripe,
      mockServices,
      {},
      { admin: true },
      { payment_intent_id: 'pi_failed' }
    );
    assert.fail('Should fail for non-succeeded payment');
  } catch (e) {
    assert.match(e.message, /Cannot refund/);
    console.log('✅ Status Check Passed');
  }

  console.log('\n🎉 All tests passed!');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

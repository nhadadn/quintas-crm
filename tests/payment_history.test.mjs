import assert from 'assert';
import { getPaymentHistory } from '../extensions/stripe/src/payment-service.js';

class MockItemsService {
  constructor(collection, context) {
    this.collection = collection;
    this.context = context;
  }

  async readOne(id) {
    if (this.collection === 'ventas') {
      if (id === 'venta_123') return { id: 'venta_123', client_id: 1 };
      throw new Error('Forbidden'); // Simulate Directus permission error
    }
  }

  async readByQuery({ filter, sort, limit, page }) {
    if (this.collection === 'pagos') {
      // Check if filtering by venta_id
      if (filter.venta_id?._eq === 'venta_123') {
        const payments = [
          {
            numero_pago: 1,
            fecha_vencimiento: '2024-01-01',
            monto: 1000,
            estatus: 'pagado',
            stripe_payment_intent_id: 'pi_1',
            stripe_last4: '4242',
            fecha_pago: '2024-01-02',
          },
          {
            numero_pago: 2,
            fecha_vencimiento: '2024-02-01',
            monto: 1000,
            estatus: 'pendiente',
            stripe_payment_intent_id: null,
            stripe_last4: null,
            fecha_pago: null,
          },
        ];

        // Filter by status if provided
        if (filter.estatus?._eq) {
          return payments.filter((p) => p.estatus === filter.estatus._eq);
        }

        return payments;
      }
      return [];
    }
    return [];
  }
}

const mockServices = {
  ItemsService: MockItemsService,
};

async function runTests() {
  console.log('--- TEST: Payment History ---');

  // Test 1: Get all payments for a sale
  console.log('\n1. Testing Get All History...');
  const result1 = await getPaymentHistory(mockServices, {}, {}, { venta_id: 'venta_123' });
  assert.strictEqual(result1.length, 2);
  assert.strictEqual(result1[0].estado_pago, 'pagado');
  console.log('✅ Get All History Passed');

  // Test 2: Filter by status
  console.log('\n2. Testing Filter by Status...');
  const result2 = await getPaymentHistory(
    mockServices,
    {},
    {},
    { venta_id: 'venta_123', status: 'pagado' }
  );
  assert.strictEqual(result2.length, 1);
  assert.strictEqual(result2[0].estado_pago, 'pagado');
  console.log('✅ Filter Test Passed');

  // Test 3: Invalid Sale ID (should fail)
  console.log('\n3. Testing Invalid Sale ID...');
  try {
    await getPaymentHistory(mockServices, {}, {}, { venta_id: 'invalid_id' });
    assert.fail('Should have thrown error');
  } catch (e) {
    assert.match(e.message, /Sale not found/);
    console.log('✅ Error Handling Passed');
  }

  console.log('\n🎉 All tests passed!');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

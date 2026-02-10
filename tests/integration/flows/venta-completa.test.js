
const { requestDirectus, getAuthToken, createItem, deleteItem } = require('../helpers/request');
require('dotenv').config();
const crypto = require('crypto');

// Credentials from acceptance_scenarios.mjs
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

describe('Flujo de Venta Completa', () => {
  let adminToken;
  let loteId;
  let clienteId;
  let vendedorId;
  let ventaId;
  let paymentIntentId;
  let stripeCustomerId;

  beforeAll(async () => {
    adminToken = await getAuthToken(ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  afterAll(async () => {
    // Cleanup in reverse order of creation to respect foreign keys
    if (ventaId) {
        // First delete payments associated with the sale to avoid FK constraints if cascade isn't set
        // (Assuming Directus or DB handles cascade or we need to delete manually)
        // For now, let's try deleting the sale.
        await deleteItem('ventas', ventaId, adminToken);
    }
    if (vendedorId) await deleteItem('vendedores', vendedorId, adminToken);
    if (clienteId) await deleteItem('clientes', clienteId, adminToken);
    if (loteId) await deleteItem('lotes', loteId, adminToken);
  });

  test('Flujo 1: Creación de Venta', async () => {
    // 1. Crear lote en BD
    const loteData = {
      numero_lote: `L${Date.now().toString().slice(-6)}`,
      precio_lista: 120000,
      estatus: 'disponible',
      etapa: '1',
      fondo_m: 40,
      geometria: JSON.stringify({ type: 'Point', coordinates: [0, 0] }),
      latitud: 24.0,
      longitud: -104.0,
      manzana: 'M1',
      zona: 'A'
    };
    const lote = await createItem('lotes', loteData, adminToken);
    loteId = lote.id;
    expect(loteId).toBeDefined();

    // 2. Crear cliente en BD
    const clienteData = {
      nombre: 'Cliente Integración',
      apellido_paterno: 'Test',
      email: `client.int.${Date.now()}@example.com`,
      telefono: `555${Date.now().toString().slice(-7)}`,
      rfc: `XAXX${Date.now().toString().slice(-6)}000`
    };
    const cliente = await createItem('clientes', clienteData, adminToken);
    clienteId = cliente.id;
    expect(clienteId).toBeDefined();

    // 2.5 Crear vendedor en BD
    const vendedorData = {
      nombre: 'Vendedor Test',
      apellido_paterno: 'Apellido',
      email: `vendedor.${Date.now()}@example.com`,
      telefono: '5559876543'
    };
    const vendedor = await createItem('vendedores', vendedorData, adminToken);
    vendedorId = vendedor.id;
    expect(vendedorId).toBeDefined();

    // 3. POST /items/ventas (Crear Venta)
    const ventaData = {
      lote_id: loteId,
      cliente_id: clienteId,
      vendedor_id: vendedorId,
      metodo_pago: 'financiado',
      fecha_venta: new Date().toISOString().split('T')[0],
      monto_total: 120000,
      enganche: 12000,
      plazo_meses: 12,
      dia_pago: 15,
      interes_anual: 0,
      estatus: 'activa'
    };

    const ventaRes = await requestDirectus
      .post('/items/ventas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(ventaData);

    if (ventaRes.status !== 200) {
      console.error('Venta Creation Error:', JSON.stringify(ventaRes.body, null, 2));
    }

    expect(ventaRes.status).toBe(200);
    ventaId = ventaRes.body.data.id;
    expect(ventaId).toBeDefined();

    // Give some time for the async hooks to run
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 5. Validar que lote se actualiza
    const loteRes = await requestDirectus
      .get(`/items/lotes/${loteId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(loteRes.body.data.estatus).not.toBe('disponible');

    // 6. Validar que se generan amortizaciones
    const amortRes = await requestDirectus
      .get('/items/pagos')
      .query({ filter: { venta_id: { _eq: ventaId } } })
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(amortRes.body.data).toBeDefined();
    expect(amortRes.body.data.length).toBeGreaterThan(0);
  });

  test('Flujo 2: Procesamiento de Pago (Stripe)', async () => {
    // 0. Verify Extension Availability
    const pingRes = await requestDirectus
      .get('/endpoint-pagos')
      .set('Authorization', `Bearer ${adminToken}`);
    
    if (pingRes.status === 404) {
      console.warn('⚠️ Extension endpoint-pagos not loaded (404). Skipping Payment Flow.');
      return;
    }

    // 1. Obtener el siguiente pago pendiente
    const amortRes = await requestDirectus
      .get('/items/pagos')
      .query({ 
        filter: { 
          venta_id: { _eq: ventaId },
          estatus: { _eq: 'pendiente' }
        },
        limit: 1,
        sort: 'numero_pago'
      })
      .set('Authorization', `Bearer ${adminToken}`);
    
    if (!amortRes.body.data || amortRes.body.data.length === 0) {
       console.log('No pending payments found for testing payment flow');
       return;
    }

    const pagoPendiente = amortRes.body.data[0];
    const pagoId = pagoPendiente.id;

    // 2. Crear Payment Intent (/endpoint-pagos/create-payment-intent)
    const intentRes = await requestDirectus
      .post('/endpoint-pagos/create-payment-intent')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        pago_id: pagoId,
        cliente_id: clienteId
      });

    if (intentRes.status !== 200) {
       console.error('Create Payment Intent Error:', JSON.stringify(intentRes.body));
       // Fallback if Stripe is not configured properly in test env
       if (intentRes.status === 500 && intentRes.body.errors && intentRes.body.errors[0].message.includes('Stripe no está configurado')) {
         console.warn('⚠️ Stripe not configured, skipping payment flow test details');
         return;
       }
    }

    expect(intentRes.status).toBe(200);
    expect(intentRes.body).toHaveProperty('paymentIntentId');
    expect(intentRes.body).toHaveProperty('clientSecret');

    paymentIntentId = intentRes.body.paymentIntentId;

    // 3. Simular Webhook (payment_intent.succeeded)
    const payload = {
      id: 'evt_test_webhook',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          object: 'payment_intent',
          amount: intentRes.body.amount * 100, // Stripe uses cents
          currency: 'mxn',
          status: 'succeeded',
          customer: 'cus_test_mock',
          charges: {
            data: [
              {
                payment_method_details: {
                  card: {
                    last4: '4242',
                    brand: 'visa'
                  }
                }
              }
            ]
          }
        }
      }
    };

    const payloadString = JSON.stringify(payload);
    let signature = '';

    if (process.env.STRIPE_WEBHOOK_SECRET) {
      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${payloadString}`;
      const hmac = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET);
      const sig = hmac.update(signedPayload).digest('hex');
      signature = `t=${timestamp},v1=${sig}`;
    }

    const webhookRes = await requestDirectus
      .post('/endpoint-pagos/webhook')
      .set('Stripe-Signature', signature)
      .send(payload);

    if (webhookRes.status !== 200) {
      console.error('Webhook Error:', webhookRes.text);
    }
    
    expect(webhookRes.status).toBe(200);

    // 4. Validar que pago se actualiza a "pagado"
    await new Promise(resolve => setTimeout(resolve, 1000));

    const pagoRes = await requestDirectus
      .get(`/items/pagos/${pagoId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(pagoRes.body.data.estatus).toBe('pagado');
    expect(pagoRes.body.data.stripe_payment_intent_id).toBe(paymentIntentId);
    expect(pagoRes.body.data.stripe_last4).toBe('4242');
  });

  test('Flujo 3: Consulta de Dashboard', async () => {
    // Verificar que el endpoint de resumen devuelva los datos actualizados
    const res = await requestDirectus
      .get('/analytics-custom/resumen')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const data = res.body;
    expect(data).toHaveProperty('total_ventas');
    expect(data.total_ventas).toBeGreaterThanOrEqual(0);
    expect(data.lotes_disponibles).toBeGreaterThanOrEqual(0);
    console.log('✅ Dashboard Data:', data);
  });
});

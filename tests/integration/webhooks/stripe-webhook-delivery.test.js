const crypto = require('crypto');
const { requestDirectus, getAuthToken, createItem, deleteItem } = require('../helpers/request');

const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

jest.setTimeout(70000);

describe('Stripe Webhook Delivery', () => {
  let adminToken;
  let clienteId;
  let vendedorId;
  let loteId;
  let ventaId;
  let pagoId;
  let paymentIntentId;

  // Helper to generate Stripe Signature
  const generateSignature = (payload) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = JSON.stringify(payload);
    const signedPayload = `${timestamp}.${payloadString}`;

    const hmac = crypto.createHmac('sha256', STRIPE_WEBHOOK_SECRET);
    const sig = hmac.update(signedPayload).digest('hex');

    return `t=${timestamp},v1=${sig}`;
  };

  beforeAll(async () => {
    adminToken = await getAuthToken(ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  afterAll(async () => {
    // Cleanup in reverse order
    if (ventaId) await deleteItem('ventas', ventaId, adminToken);
    if (vendedorId) await deleteItem('vendedores', vendedorId, adminToken);
    if (clienteId) await deleteItem('clientes', clienteId, adminToken);
    if (loteId) await deleteItem('lotes', loteId, adminToken);
  });

  test('Setup: Crear datos base (Cliente, Vendedor, Lote, Venta)', async () => {
    // 1. Crear Cliente
    const clienteData = {
      nombre: 'Webhook',
      apellido_paterno: 'Tester',
      email: `webhook.test.${Date.now()}@example.com`,
      telefono: '5555555555',
    };
    const cliente = await createItem('clientes', clienteData, adminToken);
    clienteId = cliente.id;
    expect(clienteId).toBeDefined();

    // 2. Crear Vendedor
    const vendedorData = {
      nombre: 'Vendedor',
      apellido_paterno: 'Webhook',
      email: `vendedor.webhook.${Date.now()}@example.com`,
      comision_porcentaje: 5,
    };
    const vendedor = await createItem('vendedores', vendedorData, adminToken);
    vendedorId = vendedor.id;
    expect(vendedorId).toBeDefined();

    // 3. Crear Lote
    const loteData = {
      numero_lote: `L${Date.now().toString().slice(-6)}`,
      precio_lista: 100000,
      estatus: 'disponible',
      etapa: '1',
      fondo_m: 40,
      geometria: JSON.stringify({ type: 'Point', coordinates: [0, 0] }),
      latitud: 24.0,
      longitud: -104.0,
      manzana: 'M1',
      zona: 'A',
    };
    const lote = await createItem('lotes', loteData, adminToken);
    loteId = lote.id;
    expect(loteId).toBeDefined();

    // 4. Crear Venta (Genera Pagos Automáticamente)
    const ventaData = {
      lote_id: loteId,
      cliente_id: clienteId,
      vendedor_id: vendedorId,
      fecha_venta: new Date().toISOString().split('T')[0],
      monto_total: 100000,
      enganche: 10000,
      metodo_pago: 'financiado',
      plazo_meses: 12,
      tasa_interes: 10,
      dia_pago: 15,
      estatus: 'activa',
    };
    const venta = await createItem('ventas', ventaData, adminToken);
    ventaId = venta.id;
    expect(ventaId).toBeDefined();

    // Esperar a que los hooks asíncronos generen los pagos
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Asegurar que existan los campos necesarios en la colección pagos
    try {
      const fieldsRes = await requestDirectus
        .get('/fields/pagos')
        .set('Authorization', `Bearer ${adminToken}`);
      const fields = fieldsRes.body.data.map((f) => f.field);

      if (!fields.includes('stripe_payment_intent_id')) {
        console.warn(
          '⚠️ Campo stripe_payment_intent_id no existe. Creando campos necesarios para Stripe...'
        );
        await requestDirectus
          .post('/fields/pagos')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            field: 'stripe_payment_intent_id',
            type: 'string',
            meta: { interface: 'input', readonly: false, hidden: false },
          });
        await requestDirectus
          .post('/fields/pagos')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            field: 'stripe_customer_id',
            type: 'string',
            meta: { interface: 'input', readonly: false, hidden: false },
          });
        await requestDirectus
          .post('/fields/pagos')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            field: 'stripe_last4',
            type: 'string',
            meta: { interface: 'input', readonly: false, hidden: false },
          });
        await requestDirectus
          .post('/fields/pagos')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            field: 'metodo_pago_detalle',
            type: 'json',
            meta: { interface: 'input', readonly: false, hidden: false },
          });
      }
    } catch (e) {
      console.error('Error verificando/creando campos:', e.message);
    }

    // 5. Obtener un pago generado
    const pagosRes = await requestDirectus
      .get('/items/pagos')
      .query({ filter: { venta_id: ventaId }, limit: 1 })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(pagosRes.body.data.length).toBeGreaterThan(0);
    pagoId = pagosRes.body.data[0].id;

    // Asignar un ID de Payment Intent ficticio para testear
    paymentIntentId = `pi_test_${Date.now()}`;
    await requestDirectus
      .patch(`/items/pagos/${pagoId}`)
      .send({ stripe_payment_intent_id: paymentIntentId })
      .set('Authorization', `Bearer ${adminToken}`);
  });

  test('Test 1: Webhook de Pago Exitoso', async () => {
    const payload = {
      id: `evt_test_${Date.now()}`,
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          object: 'payment_intent',
          amount: 500000, // 5000.00
          currency: 'mxn',
          status: 'succeeded',
          customer: `cus_test_${Date.now()}`,
          charges: {
            data: [
              {
                payment_method_details: {
                  card: {
                    last4: '4242',
                  },
                },
              },
            ],
          },
        },
      },
    };

    const signature = generateSignature(payload);

    const res = await requestDirectus
      .post('/endpoint-pagos/webhook')
      .set('Stripe-Signature', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });

    // Validar actualización en BD
    const pagoRes = await requestDirectus
      .get(`/items/pagos/${pagoId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const pago = pagoRes.body.data;
    expect(pago.estatus).toBe('pagado');
    expect(pago.stripe_last4).toBe('4242');
    expect(pago.fecha_pago).not.toBeNull();
  });

  test('Test 3: Idempotency de Webhooks', async () => {
    // Reenviar el mismo webhook exitoso
    const payload = {
      id: `evt_test_${Date.now()}`, // Nuevo evento, mismo payload data
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          object: 'payment_intent',
          amount: 500000,
          currency: 'mxn',
          status: 'succeeded',
        },
      },
    };

    const signature = generateSignature(payload);

    // Capturar estado actual (ya pagado)
    const pagoResBefore = await requestDirectus
      .get(`/items/pagos/${pagoId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const fechaPagoAntes = pagoResBefore.body.data.fecha_pago;

    // Esperar 1 segundo para asegurar que si se actualizara, la fecha cambiaría
    await new Promise((r) => setTimeout(r, 1000));

    const res = await requestDirectus
      .post('/endpoint-pagos/webhook')
      .set('Stripe-Signature', signature)
      .send(payload);

    expect(res.status).toBe(200);

    // Validar que NO cambió la fecha de pago (signo de que se ignoró el update)
    const pagoResAfter = await requestDirectus
      .get(`/items/pagos/${pagoId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    // NOTA: Directus guarda fechas con precisión de segundos o milisegundos dependiendo de la DB.
    // Al esperar 1s, si se hubiera actualizado `fecha_pago = new Date()`, debería ser diferente.
    // Sin embargo, si la lógica de idempotencia funciona, no debería haber update.
    // Como implementamos `if (estatus === 'pagado') break;`, no debería haber update.

    expect(pagoResAfter.body.data.fecha_pago).toBe(fechaPagoAntes);
  });

  test('Test 2: Webhook de Pago Fallido', async () => {
    // Necesitamos otro pago pendiente para este test, o reutilizar si permitimos fallar un pago pendiente.
    // Vamos a buscar otro pago de la misma venta (hay 12).
    const pagosRes = await requestDirectus
      .get('/items/pagos')
      .query({
        filter: {
          venta_id: ventaId,
          estatus: { _eq: 'pendiente' },
        },
        limit: 1,
      })
      .set('Authorization', `Bearer ${adminToken}`);

    const pagoFallidoId = pagosRes.body.data[0].id;
    const paymentIntentFailId = `pi_fail_${Date.now()}`;

    // Asignar ID
    await requestDirectus
      .patch(`/items/pagos/${pagoFallidoId}`)
      .send({ stripe_payment_intent_id: paymentIntentFailId })
      .set('Authorization', `Bearer ${adminToken}`);

    const payload = {
      id: `evt_fail_${Date.now()}`,
      object: 'event',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: paymentIntentFailId,
          object: 'payment_intent',
          last_payment_error: {
            message: 'Fondos insuficientes',
          },
        },
      },
    };

    const signature = generateSignature(payload);

    const res = await requestDirectus
      .post('/endpoint-pagos/webhook')
      .set('Stripe-Signature', signature)
      .send(payload);

    expect(res.status).toBe(200);

    // Validar actualización en BD (Notas)
    const pagoRes = await requestDirectus
      .get(`/items/pagos/${pagoFallidoId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const pago = pagoRes.body.data;
    expect(pago.notas).toContain('Fondos insuficientes');
    // El estatus no cambia según la implementación actual, sigue 'pendiente' (o 'atrasado')
    expect(pago.estatus).not.toBe('pagado');
  });
});

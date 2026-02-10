import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración
const API_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
// Usar un secreto dummy por defecto si no hay .env, pero idealmente leer del .env
// Para simulación local, necesitamos que el servidor y el cliente usen el MISMO secreto.
// Si el servidor tiene uno configurado en .env, este script debe usar el mismo.
// Intentamos leer el .env localmente.

function loadEnv() {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf-8');
      envConfig.split('\n').forEach((line) => {
        const [key, value] = line.split('=');
        if (key && value) {
          process.env[key.trim()] = value.trim();
        }
      });
    }
  } catch (e) {
    console.warn('No se pudo cargar el archivo .env, usando valores por defecto/entorno.');
  }
}

loadEnv();

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

console.log('------------------------------------------------');
console.log('🧪 INICIANDO SIMULACIÓN DE WEBHOOKS DE STRIPE');
console.log(`URL: ${API_URL}/stripe/webhook`);
console.log(`Secret (parcial): ${WEBHOOK_SECRET.substring(0, 10)}...`);
console.log('------------------------------------------------\n');

// Función para generar firma
function generateSignature(payload) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const signature = hmac.update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

async function sendWebhook(eventType, data = {}, customHeaders = {}) {
  const eventId = `evt_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const payloadObj = {
    id: eventId,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: eventType,
    data: {
      object: data,
    },
  };
  const payload = JSON.stringify(payloadObj);
  const signature = generateSignature(payload);

  const headers = {
    'Content-Type': 'application/json',
    'stripe-signature': signature,
    ...customHeaders,
  };

  try {
    console.log(`📡 Enviando evento: ${eventType} [ID: ${eventId}]`);
    const response = await fetch(`${API_URL}/stripe/webhook`, {
      method: 'POST',
      headers,
      body: payload,
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }

    const statusIcon = response.ok ? '✅' : '❌';
    console.log(`${statusIcon} Status: ${response.status}`);
    console.log(`   Response:`, responseData);

    return { status: response.status, data: responseData, eventId, payload };
  } catch (error) {
    console.error('❌ Error de red:', error.message);
    return { status: 0, error };
  }
}

async function runTests() {
  // 1. Test Firma Inválida
  console.log('\n--- PRUEBA 1: Firma Inválida ---');
  await sendWebhook(
    'payment_intent.succeeded',
    { id: 'pi_test_invalid' },
    { 'stripe-signature': 't=123,v1=invalid' }
  );

  // 2. Test Payment Intent Succeeded
  console.log('\n--- PRUEBA 2: Payment Intent Succeeded ---');
  const piId = `pi_sim_${Date.now()}`;
  const result2 = await sendWebhook('payment_intent.succeeded', {
    id: piId,
    amount: 5000,
    currency: 'mxn',
    status: 'succeeded',
    metadata: { venta_id: 100, pago_id: 200 }, // Datos simulados
  });

  // 3. Test Idempotencia (Reenviar el mismo evento)
  if (result2.eventId) {
    console.log('\n--- PRUEBA 3: Idempotencia (Mismo Event ID) ---');

    const payload = result2.payload; // Payload original
    const signature = generateSignature(payload);

    console.log(`📡 Re-enviando evento ID: ${result2.eventId}`);
    try {
      const response = await fetch(`${API_URL}/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        body: payload,
      });
      const text = await response.text();
      console.log(`${response.ok ? '✅' : '❌'} Status: ${response.status}`);
      console.log(`   Response: ${text}`);
    } catch (e) {
      console.error('Error re-enviando:', e.message);
    }
  }

  // 4. Test Payment Failed
  console.log('\n--- PRUEBA 4: Payment Intent Failed ---');
  await sendWebhook('payment_intent.payment_failed', {
    id: `pi_fail_${Date.now()}`,
    last_payment_error: { message: 'Fondos insuficientes' },
    metadata: { venta_id: 101 },
  });

  // 5. Test Refunded
  console.log('\n--- PRUEBA 5: Charge Refunded ---');
  await sendWebhook('charge.refunded', {
    id: `ch_refund_${Date.now()}`,
    amount_refunded: 5000,
    payment_intent: piId,
  });

  // 6. Test Subscription Created
  console.log('\n--- PRUEBA 6: Subscription Created ---');
  const subId = `sub_sim_${Date.now()}`;
  await sendWebhook('customer.subscription.created', {
    id: subId,
    status: 'incomplete',
    start_date: Math.floor(Date.now() / 1000),
    metadata: { venta_id: 'venta_123', cliente_id: 'cliente_456', plan_id: 'plan_789' },
  });

  // 7. Test Invoice Payment Succeeded (Suscripción)
  console.log('\n--- PRUEBA 7: Invoice Payment Succeeded (Suscripción) ---');
  await sendWebhook('invoice.payment_succeeded', {
    id: `in_sim_${Date.now()}`,
    subscription: subId,
    amount_paid: 10000,
    currency: 'mxn',
    status_transitions: { paid_at: Math.floor(Date.now() / 1000) },
    payment_intent: `pi_sub_${Date.now()}`,
    customer: 'cus_test_123',
    number: 'INV-SIM-001',
  });

  console.log('\n✅ Pruebas finalizadas.');
}

runTests();

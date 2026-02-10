import process from 'process';

const API_URL = process.env.API_URL || 'http://localhost:8055';
const TOKEN = process.env.ADMIN_TOKEN || 'admin_token_placeholder';

console.log('🚀 Iniciando Tests de Integración de Stripe para Quintas CRM');
console.log(`📡 Conectando a: ${API_URL}`);

async function runTests() {
  try {
    // 1. Test Endpoint Availability
    console.log('\n1️⃣  Verificando disponibilidad del endpoint /pagos...');
    const resHealth = await fetch(`${API_URL}/pagos`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    if (resHealth.status === 404) {
      console.error(
        '❌ Endpoint /pagos no encontrado. Asegúrate de que la extensión está cargada.'
      );
      return;
    } else if (resHealth.status === 401 || resHealth.status === 403) {
      console.warn('⚠️ Acceso denegado (401/403). Verifica el token, pero el endpoint existe.');
    } else {
      console.log(`✅ Endpoint responde con status ${resHealth.status}`);
    }

    // 2. Test Create Payment Intent Validation
    console.log('\n2️⃣  Probando validación de Create Payment Intent...');
    const resValidation = await fetch(`${API_URL}/pagos/create-payment-intent`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Empty body should fail
    });

    const dataValidation = await resValidation.json();
    if (resValidation.status === 400 && dataValidation.errors) {
      console.log('✅ Validación correcta: Se recibieron errores esperados por falta de datos.');
    } else {
      console.error(`❌ Falló validación. Status: ${resValidation.status}`, dataValidation);
    }

    // 3. Test Webhook Signature (Mock)
    console.log('\n3️⃣  Probando Webhook con firma inválida en /stripe/webhook...');
    const resWebhook = await fetch(`${API_URL}/stripe/webhook`, {
      method: 'POST',
      headers: {
        'stripe-signature': 'invalid_signature',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'payment_intent.succeeded' }),
    });

    const textWebhook = await resWebhook.text();
    if (resWebhook.status === 400 && textWebhook.includes('Webhook Error')) {
      console.log('✅ Webhook rechazó firma inválida correctamente.');
    } else {
      console.error(
        `❌ Webhook aceptó firma inválida o falló de forma inesperada. Status: ${resWebhook.status}`,
        textWebhook
      );
    }

    console.log('\n🏁 Tests preliminares completados.');
    console.log(
      'ℹ️  Para probar el flujo completo (Crear Intent), necesitas un cliente y venta real en la DB local.'
    );
  } catch (error) {
    console.error('❌ Error ejecutando tests:', error);
  }
}

runTests();

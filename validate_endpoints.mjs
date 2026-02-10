import axios from 'axios';
import { fileURLToPath } from 'url';
import path from 'path';

// Configuración
const BASE_URL = 'http://localhost:8055';
const TOKEN = process.env.ADMIN_TOKEN || 'admin-token'; // Token temporal para pruebas

async function checkEndpoint(name, url, method = 'GET') {
  try {
    console.log(`Checking ${name} (${method} ${url})...`);
    const response = await axios({
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        Authorization: `Bearer ${TOKEN}`
      },
      validateStatus: () => true // No lanzar error en 404/500 para poder loguearlo
    });

    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ ${name}: OK (${response.status})`);
      return true;
    } else {
      console.log(`❌ ${name}: Failed (${response.status}) - ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: Error de conexión (${error.message})`);
    return false;
  }
}

async function main() {
  console.log('Iniciando validación de endpoints...');
  
  // 1. Developer Portal (Ping)
  await checkEndpoint('Developer Portal', '/developer-portal/ping');

  // 2. Mapa Lotes
  await checkEndpoint('Mapa Lotes', '/mapa-lotes');

  // 3. Ventas API (New Path)
  await checkEndpoint('Ventas API', '/ventas');

  // 4. Webhooks Subscriptions (New Path)
  await checkEndpoint('Webhooks Subscriptions', '/webhooks-subscriptions');

  // 5. Clientes (Standard)
  await checkEndpoint('Clientes', '/clientes');
  
  // 6. Lotes (Custom Endpoint)
  await checkEndpoint('Lotes (Custom)', '/lotes');

  console.log('Validación completada.');
}

main();


const axios = require('axios');
require('dotenv').config();

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function testCreateLote() {
  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await axios.post(`${DIRECTUS_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    const token = loginRes.data.data.access_token;
    console.log('Logged in. Token obtained.');

    // 2. Create Lote
    const loteData = {
      numero_lote: `TEST-${Date.now()}`,
      precio_lista: 100000,
      estatus: 'disponible',
      etapa: '1',
      fondo_m: 20,
      geometria: { type: 'Point', coordinates: [0, 0] },
      latitud: 24.0,
      longitud: -104.0,
      manzana: 'M1',
      zona: 'A'
    };

    console.log('Creating lote with data:', loteData);
    const createRes = await axios.post(`${DIRECTUS_URL}/items/lotes`, loteData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Lote created successfully:', createRes.data.data);

  } catch (error) {
    console.error('❌ Error creating lote:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

testCreateLote();

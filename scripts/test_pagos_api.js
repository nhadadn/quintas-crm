
const axios = require('axios');

const DIRECTUS_URL = 'http://localhost:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function testPagosApi() {
  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await axios.post(`${DIRECTUS_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    const token = loginRes.data.data.access_token;
    console.log('Login successful.');

    // 2. Try to fetch ID 1 (Expect Failure)
    console.log('Fetching Pago ID 1 (Expected to fail)...');
    try {
      await axios.get(`${DIRECTUS_URL}/items/pagos/1`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ Unexpectedly found Pago ID 1!');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        // Directus returns 403 Forbidden for non-existent IDs sometimes if permissions are strict, 
        // or 404 if it's just not found.
        // For UUIDs, "1" might be considered invalid format (400) or just not found.
        console.log(`✅ Expected failure for ID 1. Status: ${error.response.status}`);
        console.log('Error message:', JSON.stringify(error.response.data));
      } else if (error.response) {
        console.log(`✅ Expected failure for ID 1. Status: ${error.response.status}`);
        console.log('Error message:', JSON.stringify(error.response.data));
      } else {
        console.log('✅ Expected failure for ID 1 (Network/Other).', error.message);
      }
    }

    // 3. Create a Pago (Need Venta first, but maybe we can list existing payments)
    console.log('Listing existing Pagos...');
    const listRes = await axios.get(`${DIRECTUS_URL}/items/pagos`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 1 }
    });

    if (listRes.data.data.length > 0) {
      const existingPago = listRes.data.data[0];
      console.log(`Found existing Pago: ${existingPago.id}`);
      
      // 4. Fetch the existing Pago
      console.log(`Fetching Pago ${existingPago.id}...`);
      const fetchRes = await axios.get(`${DIRECTUS_URL}/items/pagos/${existingPago.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Fetch successful!');
      console.log('Data:', fetchRes.data.data.id);
    } else {
      console.log('⚠️ No payments found to test fetch by ID.');
    }

  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testPagosApi();

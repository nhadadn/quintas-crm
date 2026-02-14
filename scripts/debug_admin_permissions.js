const axios = require('axios');

async function testAdminAccess() {
  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await axios.post('http://localhost:8055/auth/login', {
      email: 'admin@quintas.com',
      password: 'admin_quintas_2024',
    });

    const token = loginRes.data.data.access_token;
    console.log('Login successful. Token obtained.');

    // 2. Fetch clientes with sort -date_created
    console.log('Fetching clientes with sort=-date_created...');
    try {
      const clientesRes = await axios.get('http://localhost:8055/items/clientes', {
        params: {
          sort: '-date_created',
          limit: 1,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Fetch successful!');
      console.log('Data:', clientesRes.data);
    } catch (err) {
      console.error('Fetch failed!');
      if (err.response) {
        console.error('Status:', err.response.status);
        console.error('Data:', JSON.stringify(err.response.data, null, 2));
      } else {
        console.error(err.message);
      }
    }

    // 3. Fetch clientes with sort -created_at (to see if that works)
    console.log('Fetching clientes with sort=-created_at...');
    try {
      const clientesRes = await axios.get('http://localhost:8055/items/clientes', {
        params: {
          sort: '-created_at',
          limit: 1,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Fetch successful with created_at!');
      console.log('Data:', clientesRes.data);
    } catch (err) {
      console.error('Fetch failed with created_at!');
      if (err.response) {
        console.error('Status:', err.response.status);
        console.error('Data:', JSON.stringify(err.response.data, null, 2));
      } else {
        console.error(err.message);
      }
    }
  } catch (error) {
    console.error('Script failed:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAdminAccess();

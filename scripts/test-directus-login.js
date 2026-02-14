const axios = require('axios');

async function testLogin() {
  const url = 'http://localhost:8055/auth/login';
  const email = 'admin@quintas.com';
  const password = 'admin_quintas_2024';

  console.log(`Attempting login to ${url} with ${email}`);

  try {
    const response = await axios.post(url, {
      email,
      password,
      mode: 'json',
    });

    console.log('Login successful!');
    console.log('Access Token:', response.data.data.access_token ? 'Received' : 'Missing');
  } catch (error) {
    console.error('Login failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

testLogin();

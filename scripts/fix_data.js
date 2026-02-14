const axios = require('axios');

async function fixData() {
  try {
    console.log('Triggering ensureTestData via /create-test-user...');
    const response = await axios.post('http://localhost:8055/test-endpoint/create-test-user', {
      // No body needed as it uses hardcoded email in index.js for now,
      // or I should check if I can pass email.
      // Reading index.js: const email = 'cliente.prueba@quintas.com'; (hardcoded)
    });
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Data:', error.response.data);
    }
  }
}

fixData();

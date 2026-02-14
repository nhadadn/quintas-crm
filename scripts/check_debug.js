const axios = require('axios');

async function checkData() {
  try {
    const clienteId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'; // From previous logs
    console.log(`Checking /test-endpoint/inspect-client/${clienteId}...`);
    const response = await axios.get(
      `http://localhost:8055/test-endpoint/inspect-client/${clienteId}`
    );
    console.log('Response status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error calling endpoint:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

checkData();

const axios = require('axios');

async function main() {
  try {
    console.log('Checking pagos fields...');
    // We can check one field, e.g. numero_parcialidad
    const res = await axios.get('http://localhost:8055/test-endpoint/check-fields', {
      params: { collection: 'pagos', field: 'numero_parcialidad' },
    });
    console.log('Result:', JSON.stringify(res.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();

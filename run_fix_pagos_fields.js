
const axios = require('axios');

async function main() {
    try {
        console.log('Running fix-pagos-fields...');
        const res = await axios.post('http://localhost:8055/test-endpoint/fix-pagos-fields');
        console.log('Result:', JSON.stringify(res.data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

main();

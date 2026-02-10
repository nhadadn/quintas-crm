
const axios = require('axios');

async function main() {
    try {
        console.log('Setting up permissions...');
        const res = await axios.post('http://localhost:8055/test-endpoint/setup-permissions');
        console.log('Result:', res.data);

        // Also fix relations/fields again just to be sure
        console.log('Ensuring fields...');
        await axios.post('http://localhost:8055/test-endpoint/fix-fields');
        
        console.log('Ensuring relations...');
        await axios.post('http://localhost:8055/test-endpoint/fix-relations');

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

main();

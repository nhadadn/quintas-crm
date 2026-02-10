const axios = require('axios');

async function setupPermissions() {
    try {
        console.log('Setting up permissions via /test-endpoint/setup-permissions...');
        const response = await axios.post('http://localhost:8055/test-endpoint/setup-permissions', {});
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

setupPermissions();
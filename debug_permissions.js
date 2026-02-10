
const axios = require('axios');

async function main() {
    try {
        console.log('Inspecting data...');
        const res = await axios.get('http://localhost:8055/test-endpoint/inspect-data');
        
        const data = res.data;
        console.log('Clientes found:', data.clientes.length);
        if (data.clientes.length > 0) {
            console.log('First Client:', JSON.stringify(data.clientes[0], null, 2));
        }
        
        console.log('Permissions found:', data.permissions.length);
        console.log('Permissions:', JSON.stringify(data.permissions, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

main();

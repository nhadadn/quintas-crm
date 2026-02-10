
const axios = require('axios');

async function verifyData() {
    try {
        console.log('Checking /test-endpoint/inspect-data...');
        const inspectResponse = await axios.get('http://localhost:8055/test-endpoint/inspect-data');
        
        const clientes = inspectResponse.data.clientes;
        if (clientes && clientes.length > 0) {
            const client = clientes[0];
            const clienteId = client.id;
            console.log(`Found Test Client ID: ${clienteId} (Email: ${client.email})`);
            
            console.log(`Checking /test-endpoint/inspect-client/${clienteId}...`);
            const clientResponse = await axios.get(`http://localhost:8055/test-endpoint/inspect-client/${clienteId}`);
            console.log('Client Data Response:', JSON.stringify(clientResponse.data, null, 2));
            
            const paymentCount = clientResponse.data.direct_pagos_count;
            console.log(`Direct Payments Count: ${paymentCount}`);
            
            if (paymentCount >= 12) {
                console.log('SUCCESS: At least 12 payments found.');
            } else {
                console.error('FAILURE: Less than 12 payments found.');
                // Trigger fix if needed
                console.log('Triggering fix_data.js to ensure data...');
                // We can't run the script from here easily, but we can call the endpoint.
                await axios.post('http://localhost:8055/test-endpoint/create-test-user', {});
                console.log('Data generation triggered. Checking again...');
                
                const retryResponse = await axios.get(`http://localhost:8055/test-endpoint/inspect-client/${clienteId}`);
                const retryCount = retryResponse.data.direct_pagos_count;
                console.log(`Retry Direct Payments Count: ${retryCount}`);
                
                if (retryCount >= 12) {
                    console.log('SUCCESS: Payments generated on retry.');
                } else {
                    console.error('FAILURE: Still missing payments.');
                    process.exit(1);
                }
            }
        } else {
            console.error('FAILURE: Test client (cliente.prueba@quintas.com) not found in inspect-data.');
            // Trigger creation
            console.log('Triggering creation via /create-test-user...');
            await axios.post('http://localhost:8055/test-endpoint/create-test-user', {});
            // Then we'd need to fetch ID again, but let's just fail and rerun.
            console.log('User creation triggered. Rerun verification.');
            process.exit(1);
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        process.exit(1);
    }
}

verifyData();

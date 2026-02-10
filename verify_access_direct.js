
const axios = require('axios');

async function main() {
    try {
        console.log('Authenticating...');
        const authResponse = await axios.post('http://localhost:8055/auth/login', {
            email: 'cliente.prueba@quintas.com',
            password: 'Prueba123!'
        });
        const token = authResponse.data.data.access_token;
        console.log('Token obtained.');

        console.log('Attempting to fetch ventas with pagos expansion...');
        try {
            const res = await axios.get('http://localhost:8055/items/ventas', {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    fields: '*,pagos.*',
                    limit: 1
                }
            });
            console.log('Success! Ventas:', res.data.data.length);
            if (res.data.data.length > 0) {
                console.log('Pagos in first venta:', res.data.data[0].pagos);
            }
        } catch (e) {
            console.error('Error fetching ventas with pagos:', e.response?.status, e.response?.data);
        }

        console.log('Attempting to fetch ventas WITHOUT pagos expansion...');
        try {
            const res = await axios.get('http://localhost:8055/items/ventas', {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    fields: '*',
                    limit: 1
                }
            });
            console.log('Success! Ventas (no pagos):', res.data.data.length);
        } catch (e) {
            console.error('Error fetching ventas (no pagos):', e.response?.status, e.response?.data);
        }

    } catch (error) {
        console.error('Fatal Error:', error.message);
    }
}

main();

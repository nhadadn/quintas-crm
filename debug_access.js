const axios = require('axios');

async function debugAccess() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginResponse = await axios.post('http://localhost:8055/auth/login', {
            email: 'cliente.prueba@quintas.com',
            password: 'Prueba123!'
        });
        const token = loginResponse.data.data.access_token;
        console.log('Token received.');

        // 2. Try to read pagos directly
        console.log('Reading pagos directly...');
        try {
            const pagosResponse = await axios.get('http://localhost:8055/items/pagos?limit=5', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Pagos count:', pagosResponse.data.data.length);
            if (pagosResponse.data.data.length > 0) {
                console.log('First pago:', pagosResponse.data.data[0]);
            }
        } catch (err) {
            console.error('Error reading pagos:', err.response?.data || err.message);
        }

        // 3. Try to read ventas with pagos
        console.log('Reading ventas with pagos...');
        try {
            const ventasResponse = await axios.get('http://localhost:8055/items/ventas?fields=*,pagos.id,pagos.monto', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Ventas count:', ventasResponse.data.data.length);
            if (ventasResponse.data.data.length > 0) {
                console.log('First venta pagos:', ventasResponse.data.data[0].pagos);
            }
        } catch (err) {
            console.error('Error reading ventas:', err.response?.data || err.message);
        }

    } catch (error) {
        console.error('Fatal error:', error.message);
    }
}

debugAccess();
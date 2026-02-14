const axios = require('axios');

async function verifyData() {
  try {
    console.log('Verifying data for user: cliente.prueba@quintas.com');

    // 1. Get token
    const authResponse = await axios.post('http://localhost:8055/auth/login', {
      email: 'cliente.prueba@quintas.com',
      password: 'Prueba123!',
    });
    const token = authResponse.data.data.access_token;
    console.log('Token obtained.');

    // 2. Check /perfil endpoint
    console.log('Checking /perfil endpoint...');
    const perfilResponse = await axios.get('http://localhost:8055/perfil', {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('Full /perfil response:', JSON.stringify(perfilResponse.data, null, 2));

    const clientData = perfilResponse.data;
    const perfil = clientData.perfil;

    console.log('Client Data ID:', perfil?.id);

    if (perfil && perfil.ventas && perfil.ventas.length > 0) {
      console.log('Ventas found:', perfil.ventas.length);
      const venta = perfil.ventas[0];
      console.log('Venta ID:', venta.id);

      if (venta.pagos && venta.pagos.length > 0) {
        console.log('Pagos found in Venta:', venta.pagos.length);
        console.log('First pago:', venta.pagos[0]);
      } else {
        console.error('NO PAGOS found in Venta!');

        // Try to fetch pagos directly to check permissions
        console.log('Attempting to fetch pagos directly...');
        try {
          const pagosResponse = await axios.get('http://localhost:8055/items/pagos', {
            headers: { Authorization: `Bearer ${token}` },
            params: { filter: { venta_id: { _eq: venta.id } } },
          });
          console.log('Direct Pagos Fetch:', pagosResponse.data.data.length);

          // Test Ventas Expansion via API
          console.log('Testing Ventas Expansion via API...');
          const ventasResponse = await axios.get('http://localhost:8055/items/ventas', {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              filter: { id: { _eq: venta.id } },
              fields: '*,pagos.*',
            },
          });
          console.log('Ventas API Response Pagos:', ventasResponse.data.data[0].pagos?.length || 0);
        } catch (err) {
          console.error(
            'Error fetching pagos/ventas directly:',
            err.response?.status,
            err.response?.data
          );
        }
      }
    } else {
      console.error('NO VENTAS found!');
    }
  } catch (error) {
    console.error('Error verifying data:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

verifyData();

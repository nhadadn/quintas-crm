const axios = require('axios');

async function main() {
  let token;
  try {
    // 1. Intentar login
    console.log('Intentando login...');
    const loginResponse = await axios.post('http://localhost:8055/auth/login', {
      email: 'cliente.prueba@quintas.com',
      password: 'Prueba123!',
    });

    token = loginResponse.data.data.access_token;
    console.log('Logged in, token received.');

    const userResponse = await axios.get('http://localhost:8055/users/me?fields=role.*', {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('User Role:', JSON.stringify(userResponse.data.data.role, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
  // 3. Verificar endpoint /perfil
  try {
    console.log('Verifying /perfil endpoint...');
    const perfilResponse = await axios.get('http://localhost:8055/perfil', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Perfil Response Status:', perfilResponse.status);
    console.log('Full Response Data:', JSON.stringify(perfilResponse.data, null, 2));
    // console.log('Perfil Name:', perfilResponse.data.data.perfil.nombre);
    const ventas = perfilResponse.data.data.perfil.ventas;
    console.log('Ventas found:', ventas?.length || 0);
    if (ventas && ventas.length > 0) {
      console.log('First Venta ID:', ventas[0].id);
      console.log('Pagos in Venta:', ventas[0].pagos?.length || 0);
    }
  } catch (error) {
    console.error('Error accessing /perfil:', error.response?.data || error.message);
  }
}

main();

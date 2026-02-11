/**
 * Ejemplo de Flujo de Autenticación OAuth 2.0 (Authorization Code)
 *
 * Nota: Este script simula el paso de intercambio de código.
 * En una app real, el usuario primero es redirigido al navegador para obtener el 'code'.
 */

const axios = require('axios');

const CONFIG = {
  baseUrl: 'http://localhost:8055',
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  redirectUri: 'http://localhost:3000/callback',
  authCode: 'CODE_RECEIVED_FROM_REDIRECT', // Reemplazar con código real
};

async function exchangeCodeForToken() {
  try {
    console.log('🔄 Intercambiando código por token...');
    const response = await axios.post(`${CONFIG.baseUrl}/auth/oauth/token`, {
      grant_type: 'authorization_code',
      code: CONFIG.authCode,
      redirect_uri: CONFIG.redirectUri,
      client_id: CONFIG.clientId,
      client_secret: CONFIG.clientSecret,
    });

    const { access_token, refresh_token, expires_in } = response.data;
    console.log('✅ Token obtenido con éxito:');
    console.log('Access Token:', access_token.substring(0, 20) + '...');
    console.log('Refresh Token:', refresh_token.substring(0, 20) + '...');
    console.log('Expires in:', expires_in, 'seconds');

    return access_token;
  } catch (error) {
    console.error(
      '❌ Error obteniendo token:',
      error.response ? error.response.data : error.message
    );
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  exchangeCodeForToken();
}

module.exports = { exchangeCodeForToken };

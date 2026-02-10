import axios from 'axios';
import http from 'http';
import https from 'https';

// Optimización: Agentes HTTP/HTTPS con KeepAlive para reutilizar conexiones TCP
// Esto reduce drásticamente la latencia en peticiones secuenciales a Directus (localhost)
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

// Cliente Axios optimizado para Auth
export const authClient = axios.create({
  timeout: 15000,
  httpAgent,
  httpsAgent,
  headers: { 'Content-Type': 'application/json' },
});

export async function refreshAccessToken(token: any) {
  try {
    const directusUrl =
      process.env.DIRECTUS_INTERNAL_URL ||
      process.env.DIRECTUS_URL ||
      process.env.NEXT_PUBLIC_DIRECTUS_URL;

    if (!directusUrl) {
      throw new Error('DIRECTUS_URL not set');
    }

    const response = await authClient.post(`${directusUrl}/auth/refresh`, {
      refresh_token: token.refreshToken,
      mode: 'json',
    });

    const { access_token, refresh_token, expires } = response.data.data;

    return {
      ...token,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + expires,
    };
  } catch (error) {
    console.error('Error refreshing access token', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

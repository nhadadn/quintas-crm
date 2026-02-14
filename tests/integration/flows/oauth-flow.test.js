const { requestDirectus, getAuthToken, deleteItem } = require('../helpers/request');
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

describe('Flujo OAuth 2.0', () => {
  let adminToken;
  let clientId;
  let clientSecret;
  let authCode;
  let accessToken;
  let refreshToken;

  beforeAll(async () => {
    adminToken = await getAuthToken(ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  afterAll(async () => {
    if (clientId) {
      await deleteItem('oauth_clients', clientId, adminToken);
    }
  });

  test('1. Registrar Aplicación OAuth', async () => {
    const appName = `Test App ${Date.now()}`;
    const res = await requestDirectus
      .post('/developer-portal/register-app')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: appName,
        redirect_uris: ['http://localhost:9999/callback'],
        scopes: ['read_profile'],
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('client_id');
    expect(res.body.data).toHaveProperty('client_secret');

    clientId = res.body.data.client_id;
    clientSecret = res.body.data.client_secret;
  });

  test('2. Obtener Authorization Code', async () => {
    if (!clientId) return;

    const res = await requestDirectus
      .get('/custom-oauth/authorize')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        client_id: clientId,
        redirect_uri: 'http://localhost:9999/callback',
        scope: 'read_profile',
        state: 'xyz123',
        approve: true,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('redirect_to');

    const redirectUrl = new URL(res.body.redirect_to);
    authCode = redirectUrl.searchParams.get('code');
    expect(authCode).toBeDefined();
  });

  test('3. Intercambiar Code por Token', async () => {
    if (!authCode) return;

    const res = await requestDirectus.post('/custom-oauth/token').send({
      grant_type: 'authorization_code',
      code: authCode,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: 'http://localhost:9999/callback',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');

    accessToken = res.body.access_token;
    refreshToken = res.body.refresh_token;
  });

  test('4. Usar Access Token para acceder a recurso protegido', async () => {
    if (!accessToken) return;

    // Intentamos acceder a recurso protegido del proveedor
    const res = await requestDirectus
      .get('/custom-oauth/me')
      .set('X-Custom-Auth', `Bearer ${accessToken}`); // Use custom header to avoid Directus stripping it

    if (res.status !== 200) {
      console.error('OAuth Test Error Body:', JSON.stringify(res.body));
    }

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'mock_user_id');
  });

  test('5. Refresh Token Flow', async () => {
    if (!refreshToken) return;

    const res = await requestDirectus.post('/custom-oauth/token').send({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    // Nuevo access token
    expect(res.body.access_token).not.toBe(accessToken);
  });
});

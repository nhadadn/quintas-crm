import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export default (router, context) => {
  const { services, getSchema, env, database } = context;
  const { ItemsService } = services;

  const JWT_SECRET = env.SECRET || process.env.SECRET || 'secret-key-fallback';
  const FRONTEND_URL = env.FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

  // Helper: Generar Authorization Code
  const generateCode = () => crypto.randomBytes(20).toString('hex');

  // Helper: Validar Cliente
  const getClient = async (clientId) => {
    const schema = await getSchema();
    // Usar contexto administrativo para leer clientes (público lectura de config básica suele requerir admin o permisos públicos)
    // Aquí usamos adminService para validar internamente
    const adminService = new ItemsService('oauth_clients', { schema, knex: database });
    const client = await adminService.readOne(clientId);
    return client;
  };

  // =================================================================================
  // GET /authorize
  // Inicializa el flujo. Valida parámetros y redirige al Frontend de Consentimiento.
  // =================================================================================
  router.get('/authorize', async (req, res) => {
    try {
      const { client_id, redirect_uri, scope, state, response_type } = req.query;

      if (!client_id || !redirect_uri || response_type !== 'code') {
        return res.status(400).send('Invalid request parameters');
      }

      // 1. Validar Cliente
      const client = await getClient(client_id);
      if (!client) {
        return res.status(400).send('Invalid Client ID');
      }

      // 2. Validar Redirect URI
      // client.redirect_uris debería ser un array o string JSON
      let allowedUris = client.redirect_uris;
      if (typeof allowedUris === 'string') {
        try {
          allowedUris = JSON.parse(allowedUris);
        } catch (e) {
          allowedUris = [allowedUris];
        }
      }
      if (!Array.isArray(allowedUris)) allowedUris = [allowedUris];

      if (!allowedUris.includes(redirect_uri)) {
        return res.status(400).send('Redirect URI mismatch');
      }

      // 3. Redirigir al Frontend Consent Page
      // Pasamos los mismos parámetros para que el Frontend los muestre
      const params = new URLSearchParams({
        client_id,
        redirect_uri,
        scope: scope || '',
        state: state || '',
        app_name: client.name,
      });

      return res.redirect(`${FRONTEND_URL}/oauth/consent?${params.toString()}`);
    } catch (error) {
      console.error('Error in GET /authorize:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // =================================================================================
  // POST /authorize
  // Procesa la decisión del usuario (Allow/Deny) desde el Frontend.
  // Requiere autenticación de usuario (session cookie o token).
  // =================================================================================
  router.post('/authorize', async (req, res) => {
    try {
      // 1. Verificar Usuario Autenticado
      if (!req.accountability || !req.accountability.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const userId = req.accountability.user;

      const { client_id, redirect_uri, scope, state, approve } = req.body;

      if (!approve) {
        // Si el usuario denegó, redirigir con error
        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.append('error', 'access_denied');
        if (state) redirectUrl.searchParams.append('state', state);
        return res.json({ redirect_to: redirectUrl.toString() });
      }

      // 2. Generar Authorization Code
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

      // 3. Guardar Code en DB
      const schema = await getSchema();
      const codesService = new ItemsService('oauth_codes', { schema, knex: database });

      await codesService.createOne({
        code,
        client_id,
        user_id: userId,
        redirect_uri,
        scopes: scope ? scope.split(' ') : [], // Guardar como array o JSON
        expires_at: expiresAt,
      });

      // 4. Retornar URL de redirección
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.append('code', code);
      if (state) redirectUrl.searchParams.append('state', state);

      return res.json({ redirect_to: redirectUrl.toString() });
    } catch (error) {
      console.error('Error in POST /authorize:', error);
      res.status(500).json({ error: 'server_error', message: error.message });
    }
  });

  // =================================================================================
  // POST /token
  // Intercambia Code por Access Token
  // =================================================================================
  router.post('/token', async (req, res) => {
    try {
      const { grant_type, code, client_id, client_secret, redirect_uri, refresh_token } = req.body;

      const schema = await getSchema();

      // --- Flow: Authorization Code ---
      if (grant_type === 'authorization_code') {
        if (!code || !client_id || !client_secret || !redirect_uri) {
          return res
            .status(400)
            .json({ error: 'invalid_request', error_description: 'Missing parameters' });
        }

        // 1. Validar Cliente y Secret
        const adminService = new ItemsService('oauth_clients', { schema, knex: database });
        const client = await adminService.readOne(client_id);

        if (!client || client.client_secret !== client_secret) {
          return res.status(401).json({ error: 'invalid_client' });
        }

        // 2. Validar Code
        const codesService = new ItemsService('oauth_codes', { schema, knex: database });
        const storedCodes = await codesService.readByQuery({
          filter: { code: { _eq: code } },
          limit: 1,
        });

        if (!storedCodes || storedCodes.length === 0) {
          return res
            .status(400)
            .json({ error: 'invalid_grant', error_description: 'Invalid code' });
        }
        const storedCode = storedCodes[0];

        // Validar expiración y redirect_uri
        if (new Date(storedCode.expires_at) < new Date()) {
          return res
            .status(400)
            .json({ error: 'invalid_grant', error_description: 'Code expired' });
        }
        if (storedCode.redirect_uri !== redirect_uri) {
          return res
            .status(400)
            .json({ error: 'invalid_grant', error_description: 'Redirect URI mismatch' });
        }
        if (storedCode.client_id !== client_id) {
          // Doble check
          return res.status(400).json({ error: 'invalid_grant' });
        }

        // 3. Generar Access Token y Refresh Token
        const accessTokenPayload = {
          iss: 'QuintasCRM',
          sub: storedCode.user_id,
          aud: client_id,
          scope: Array.isArray(storedCode.scopes) ? storedCode.scopes.join(' ') : storedCode.scopes,
        };

        const accessToken = jwt.sign(accessTokenPayload, JWT_SECRET, { expiresIn: '1h' });
        const refreshToken = crypto.randomBytes(32).toString('hex');
        const accessTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
        const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30d

        // 4. Guardar Tokens en DB
        const tokensService = new ItemsService('oauth_access_tokens', { schema, knex: database });
        await tokensService.createOne({
          access_token: accessToken,
          refresh_token: refreshToken,
          client_id: client_id,
          user_id: storedCode.user_id,
          scopes: storedCode.scopes,
          expires_at: accessTokenExpiresAt,
          refresh_token_expires_at: refreshTokenExpiresAt,
        });

        // 5. Borrar Code usado
        await codesService.deleteOne(storedCode.id);

        return res.json({
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: refreshToken,
          scope: accessTokenPayload.scope,
        });
      }

      // --- Flow: Refresh Token ---
      if (grant_type === 'refresh_token') {
        if (!refresh_token || !client_id || !client_secret) {
          return res.status(400).json({ error: 'invalid_request' });
        }

        // 1. Validar Cliente
        const adminService = new ItemsService('oauth_clients', { schema, knex: database });
        const client = await adminService.readOne(client_id);
        if (!client || client.client_secret !== client_secret) {
          return res.status(401).json({ error: 'invalid_client' });
        }

        // 2. Buscar Refresh Token
        const tokensService = new ItemsService('oauth_access_tokens', { schema, knex: database });
        const storedTokens = await tokensService.readByQuery({
          filter: { refresh_token: { _eq: refresh_token }, client_id: { _eq: client_id } },
          limit: 1,
        });

        if (!storedTokens || storedTokens.length === 0) {
          return res
            .status(400)
            .json({ error: 'invalid_grant', error_description: 'Invalid refresh token' });
        }
        const oldTokenRecord = storedTokens[0];

        // Validar expiración
        if (new Date(oldTokenRecord.refresh_token_expires_at) < new Date()) {
          return res
            .status(400)
            .json({ error: 'invalid_grant', error_description: 'Refresh token expired' });
        }

        // 3. Generar Nuevos Tokens
        const accessTokenPayload = {
          iss: 'QuintasCRM',
          sub: oldTokenRecord.user_id,
          aud: client_id,
          scope: Array.isArray(oldTokenRecord.scopes)
            ? oldTokenRecord.scopes.join(' ')
            : oldTokenRecord.scopes,
        };

        const newAccessToken = jwt.sign(accessTokenPayload, JWT_SECRET, { expiresIn: '1h' });
        const newRefreshToken = crypto.randomBytes(32).toString('hex');
        const accessTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
        const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // 4. Actualizar DB (Rotación de Refresh Token)
        await tokensService.updateOne(oldTokenRecord.id, {
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
          expires_at: accessTokenExpiresAt,
          refresh_token_expires_at: refreshTokenExpiresAt,
        });

        return res.json({
          access_token: newAccessToken,
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: newRefreshToken,
          scope: accessTokenPayload.scope,
        });
      }

      return res.status(400).json({ error: 'unsupported_grant_type' });
    } catch (error) {
      console.error('Error in POST /token:', error);
      res.status(500).json({ error: 'server_error', message: error.message });
    }
  });
};

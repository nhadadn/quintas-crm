import jwt from 'jsonwebtoken';

/**
 * Middleware de Autenticación OAuth 2.0
 * Valida Access Tokens y adjunta el usuario al request.
 * @param {Object} context - Contexto de Directus (services, database, getSchema, env)
 * @returns {Function} Middleware Express (req, res, next)
 */
export const createOAuthMiddleware = ({ services, database, getSchema, env }) => {
  const { ItemsService } = services;
  const jwtSecret = env.SECRET || process.env.SECRET || 'secret-key-fallback';

  return async (req, res, next) => {
    try {
      // 1. Validar Header Authorization
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Si no hay token, continuamos sin autenticación (público)
        // O retornamos 401 si se fuerza.
        // Para ser flexible, si no hay token, no hacemos nada y dejamos que requireScopes decida o el endpoint.
        // PERO, la especificación dice "Validar... Si inválido, return 401".
        // Asumiremos que si se aplica este middleware, se ESPERA autenticación.
        // Sin embargo, para permitir endpoints híbridos, podemos dejar pasar si no hay header,
        // pero si hay header y es malo, fallamos.
        // El prompt dice "Validar header... Si inválido, return 401".
        // Si NO hay header, también es "inválido" para un endpoint protegido.

        // Opción A: Middleware estricto.
        return res.status(401).json({
          error: 'unauthorized',
          error_description: 'Missing or invalid Authorization header',
        });
      }

      const token = authHeader.split(' ')[1];

      // 2. Verificar Firma JWT (Stateless)
      let decoded;
      try {
        decoded = jwt.verify(token, jwtSecret);
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          return res
            .status(401)
            .json({ error: 'invalid_token', error_description: 'Token expired' });
        }
        return res
          .status(401)
          .json({ error: 'invalid_token', error_description: 'Token signature invalid' });
      }

      // 3. Verificar existencia y revocación en BD (Stateful)
      const schema = await getSchema();
      const accessTokensService = new ItemsService('oauth_access_tokens', {
        schema,
        knex: database,
      });

      const storedTokens = await accessTokensService.readByQuery({
        filter: { access_token: { _eq: token } },
        limit: 1,
      });

      if (!storedTokens || storedTokens.length === 0) {
        return res
          .status(401)
          .json({ error: 'invalid_token', error_description: 'Token not found or revoked' });
      }

      const storedToken = storedTokens[0];

      // Validar expiración (BD source of truth)
      if (new Date(storedToken.expires_at) < new Date()) {
        return res.status(401).json({ error: 'invalid_token', error_description: 'Token expired' });
      }

      // 4. Adjuntar info al request
      req.oauth = {
        user_id: storedToken.user_id,
        client_id: storedToken.client_id,
        scopes: storedToken.scopes || [],
        token_id: storedToken.id,
      };

      // Inyectar en accountability para que Directus sepa quién es (si se usa ItemsService downstream)
      // Nota: Esto permite que req.accountability.user sea el usuario del token.
      req.accountability = {
        ...req.accountability,
        user: storedToken.user_id,
        role: null, // Directus buscará el rol del usuario si es null? No necesariamente.
        // Si queremos full integration, deberíamos buscar el rol del usuario.
        // Pero por ahora, basta con user_id para auditoría básica.
      };

      next();
    } catch (error) {
      console.error('OAuth Middleware Error:', error);
      return res
        .status(500)
        .json({ error: 'server_error', error_description: 'Internal validation error' });
    }
  };
};

/**
 * Middleware para validar Scopes requeridos
 * @param {Array<string>} requiredScopes - Lista de scopes requeridos (AND logic)
 * @returns {Function} Middleware Express
 */
export const requireScopes = (requiredScopes) => {
  return (req, res, next) => {
    // Asume que createOAuthMiddleware ya se ejecutó
    if (!req.oauth || !req.oauth.scopes) {
      return res.status(401).json({
        error: 'unauthorized',
        error_description: 'Authentication required for scope validation',
      });
    }

    const userScopes = req.oauth.scopes;

    // Verificar que tenga TODOS los scopes requeridos
    const missingScopes = requiredScopes.filter((scope) => !userScopes.includes(scope));

    if (missingScopes.length > 0) {
      return res.status(403).json({
        error: 'insufficient_scope',
        error_description: `Missing required scopes: ${missingScopes.join(', ')}`,
      });
    }

    next();
  };
};

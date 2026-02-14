# OAuth Middleware Documentation

Este módulo proporciona middleware para autenticación y autorización basada en OAuth 2.0 para extensiones de Directus.

## Comportamiento

El middleware `createOAuthMiddleware` realiza las siguientes validaciones en orden:

1.  **Validación de Header**: Verifica que el request tenga un header `Authorization` con formato `Bearer <token>`.
2.  **Verificación de Firma (Stateless)**: Valida la firma del JWT usando la variable de entorno `SECRET`.
3.  **Verificación de Base de Datos (Stateful)**:
    *   Consulta la tabla `oauth_access_tokens`.
    *   Verifica que el token exista.
    *   Verifica que no esté expirado (`expires_at > NOW()`).

Si todas las validaciones pasan, se inyecta la información del usuario en:
*   `req.oauth`: Contiene `user_id`, `client_id`, `scopes`, `token_id`.
*   `req.accountability`: Actualiza `user` para integración con Directus.

## Casos de Prueba Cubiertos

Los tests unitarios (`tests/backend/extensions/middleware/oauth-auth.test.js`) cubren los siguientes escenarios:

1.  **Header Faltante**: Retorna 401 `unauthorized`.
2.  **Header Inválido**: (e.g., Basic Auth) Retorna 401 `unauthorized`.
3.  **Token Inválido (Firma)**: Retorna 401 `invalid_token`.
4.  **Token No Encontrado/Revocado**: Retorna 401 con descripción específica.
5.  **Token Expirado**: Retorna 401 con descripción específica.
6.  **Token Válido**: Llama a `next()` y popúla `req.oauth`.
7.  **Scope Validation**:
    *   Falta autenticación: 401.
    *   Scopes insuficientes: 403.
    *   Scopes suficientes: `next()`.

## Guía de Debugging

Si encuentras errores de autenticación (401/403):

1.  **Verificar Header**: Asegúrate de enviar `Authorization: Bearer <token>`.
2.  **Verificar Secret**: El entorno de pruebas y producción deben tener la misma `SECRET` para firmar y verificar.
3.  **Consultar Base de Datos**:
    *   Busca el token en `oauth_access_tokens`.
    *   SQL: `SELECT * FROM oauth_access_tokens WHERE access_token = 'TU_TOKEN';`
    *   Verifica `expires_at`.
4.  **Logs del Servidor**: El middleware loguea errores internos con `OAuth Middleware Error:`.

## Uso

```javascript
import { createOAuthMiddleware, requireScopes } from './middleware/oauth-auth.mjs';

// En tu extensión (index.js)
export default (router, context) => {
  const auth = createOAuthMiddleware(context);
  
  // Proteger todas las rutas
  router.use(auth);

  // Proteger ruta específica con scopes
  router.get('/protected', requireScopes(['read:data']), (req, res) => {
    res.json({ user: req.oauth.user_id });
  });
};
```

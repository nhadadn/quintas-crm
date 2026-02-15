# Guía para Desarrolladores: Quintas de Otinapa ERP API

Bienvenido a la API pública del ERP de Quintas de Otinapa. Esta API permite a desarrolladores integrar aplicaciones externas, automatizar procesos y construir interfaces personalizadas sobre nuestra plataforma.

## 1. Introducción y Objetivos

El objetivo de esta API es proporcionar acceso programático seguro a los módulos principales del ERP:

- **Gestión de Lotes**: Consulta de inventario en tiempo real.
- **Ventas**: Procesamiento de nuevas ventas y generación de contratos.
- **Webhooks**: Notificaciones en tiempo real sobre eventos del sistema.

## 2. Prerrequisitos

Para interactuar con la API, necesitas credenciales de OAuth 2.0. Contacta al administrador del sistema para obtener:

- **Client ID**
- **Client Secret**
- **Redirect URI** (para flujo Authorization Code)

## 3. Autenticación (OAuth 2.0)

La API utiliza OAuth 2.0 para asegurar todos los endpoints. Soportamos el flujo **Authorization Code** con **PKCE** (recomendado para apps públicas) y Refresh Tokens.

### Flujo de Autenticación

#### Paso 1: Obtener Código de Autorización

Redirige al usuario a:

```
GET /auth/oauth/authorize?response_type=code&client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&scope=read:lotes write:ventas offline_access
```

#### Paso 2: Intercambiar Código por Token

Realiza un POST a:

```
POST /auth/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "{AUTHORIZATION_CODE}",
  "redirect_uri": "{REDIRECT_URI}",
  "client_id": "{CLIENT_ID}",
  "client_secret": "{CLIENT_SECRET}"
}
```

Respuesta exitosa:

```json
{
  "access_token": "eyJhbG...",
  "expires_in": 900,
  "refresh_token": "def502...",
  "token_type": "Bearer"
}
```

#### Paso 3: Usar el Token

Incluye el token en el header `Authorization` de tus peticiones:

```
Authorization: Bearer eyJhbG...
```

## 4. Endpoints Principales

La documentación interactiva completa está disponible en `/api-docs`.

### Lotes

- `GET /api/v1/lotes`: Listar lotes disponibles.
  - Query Params: `status` (disponible, apartado, vendido), `zona`.
- `GET /api/v1/lotes/{id}`: Obtener detalles de un lote específico, incluyendo imágenes.

### Ventas

- `GET /api/v1/ventas`: Listar ventas (filtro automático por permisos del usuario).
- `POST /api/v1/ventas`: Crear una nueva venta. Requiere scope `write:ventas`.

## 5. Rate Limiting y Quotas

Para garantizar la estabilidad del sistema, aplicamos los siguientes límites por usuario/cliente:

- **Lectura (GET)**: 100 peticiones por hora.
- **Escritura (POST)**: 10 peticiones por hora.

Si excedes el límite, recibirás un error `429 Too Many Requests`.

## 6. Webhooks

Puedes suscribirte a eventos para recibir notificaciones HTTP POST en tu servidor.

Eventos soportados:

- `venta.created`: Nueva venta registrada.
- `venta.liquidado`: Venta pagada totalmente.
- `pago.completed`: Pago registrado.

Verifica la firma HMAC en el header `X-Webhook-Signature` usando tu `webhook_secret`.

## 7. Manejo de Errores

La API utiliza códigos de estado HTTP estándar y un formato JSON de error consistente:

```json
{
  "errors": [
    {
      "message": "Descripción del error",
      "code": "ERROR_CODE",
      "path": ["campo_afectado"]
    }
  ]
}
```

## 8. Best Practices

- **Usa Refresh Tokens**: Los access tokens expiran en 15 minutos. Usa el refresh token para obtener uno nuevo sin molestar al usuario.
- **Maneja 429**: Implementa "exponential backoff" si recibes errores de rate limit.
- **Valida Webhooks**: Siempre verifica la firma criptográfica de los webhooks entrantes.

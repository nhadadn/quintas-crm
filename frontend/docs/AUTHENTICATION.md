# Documentación del Flujo de Autenticación

## Resumen
El sistema utiliza **NextAuth.js v5** para la gestión de sesiones y autenticación, integrándose con **Directus** como proveedor de identidad. Se implementa el patrón de credenciales (Credentials Provider) donde NextAuth actúa como proxy entre el frontend y la API de Directus.

## Arquitectura

1.  **Frontend (Next.js)**: Utiliza `useSession` para acceder al estado de autenticación.
2.  **NextAuth (BFF)**: Maneja las cookies de sesión y la rotación de tokens JWT.
3.  **Backend (Directus)**: Valida credenciales y emite tokens (access_token, refresh_token).

## Flujo de Login

1.  Usuario ingresa credenciales en el formulario de login.
2.  NextAuth llama al endpoint `/auth/login` de Directus.
3.  Directus retorna `access_token`, `refresh_token` y `expires` (tiempo de vida).
4.  NextAuth almacena estos datos en un JWT encriptado (cookie `authjs.session-token`).
5.  Se consulta `/users/me` para obtener el rol y detalles del usuario.
6.  Se enriquece la sesión con `clienteId` o `vendedorId` según corresponda.

## Manejo de Tokens y Rotación

Los tokens de acceso de Directus tienen un tiempo de vida corto (por defecto 15 minutos). Para mantener la sesión activa sin obligar al usuario a loguearse nuevamente, implementamos un mecanismo de rotación de tokens automática.

### Lógica de Renovación (Refresh Token)

El callback `jwt` en `lib/auth.ts` maneja la lógica:

1.  **Inicio de sesión**: Se guardan los tokens iniciales y la fecha de expiración (`expiresAt`).
2.  **Validación**: En cada petición que requiere sesión, se verifica si el token ha expirado (con un margen de seguridad de 1 minuto).
3.  **Renovación**:
    - Si el token expiró, se llama a `refreshAccessToken`.
    - Esta función consume el endpoint `/auth/refresh` de Directus usando el `refreshToken`.
    - Si es exitoso, se actualizan `accessToken`, `refreshToken` y `expiresAt`.
    - Si falla (ej. refresh token también expiró), se marca el token con error `RefreshAccessTokenError`, forzando el cierre de sesión en el cliente.

## Uso en el Frontend

Para realizar peticiones autenticadas a Directus desde el cliente:

```typescript
import { useSession } from 'next-auth/react';
import { fetchLotesAsGeoJSON } from '@/lib/directus-api';

export default function MiComponente() {
  const { data: session } = useSession();

  useEffect(() => {
    const cargarDatos = async () => {
      // Pasar el token explícitamente
      const token = session?.accessToken;
      const datos = await fetchLotesAsGeoJSON(filtros, token);
    };
    cargarDatos();
  }, [session]);
}
```

## Pruebas

Las pruebas unitarias para la lógica de autenticación se encuentran en `tests/unit/auth.test.ts`.
Ejecutar pruebas: `npm run test:unit`

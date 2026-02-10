/**
 * Configuración Principal de NextAuth v5.
 * Documentación: documentacion/ninja/RESUMEN_CAMBIOS_FASE_5.md
 *
 * Implementa:
 * - Proveedor de Credenciales (Directus)
 * - Enriquecimiento de sesión (clienteId)
 * - Manejo de errores personalizados
 */

import NextAuth, { AuthError, CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import axios from 'axios';
import http from 'http';
import https from 'https';
import { JWT } from 'next-auth/jwt';

// Optimización: Agentes HTTP/HTTPS con KeepAlive para reutilizar conexiones TCP
// Esto reduce drásticamente la latencia en peticiones secuenciales a Directus (localhost)
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

// Cliente Axios optimizado para Auth
const authClient = axios.create({
  timeout: 15000,
  httpAgent,
  httpsAgent,
  headers: { 'Content-Type': 'application/json' },
});

// Definir tipos para extender Session y User
declare module 'next-auth' {
  interface User {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    role?: string;
    id?: string;
    clienteId?: string; // ID en tabla clientes
    vendedorId?: string; // ID en tabla vendedores
  }

  interface Session {
    accessToken?: string;
    error?: string;
    user: {
      role?: string;
      id?: string;
      clienteId?: string;
      vendedorId?: string;
    } & import('next-auth').DefaultSession['user'];
  }
}

// Definir tipos para extender JWT
declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    role?: string;
    id?: string;
    clienteId?: string;
    vendedorId?: string;
    error?: string;
  }
}

class InvalidCredentialsError extends CredentialsSignin {
  code = 'invalid_credentials';
  message = 'Credenciales inválidas';
}

class UserNotFoundError extends CredentialsSignin {
  code = 'user_not_found';
  message = 'Usuario no encontrado';
}

class InactiveAccountError extends CredentialsSignin {
  code = 'account_inactive';
  message = 'Cuenta inactiva';
}

class AccessDeniedError extends CredentialsSignin {
  code = 'access_denied';
  message = 'Acceso denegado: Solo clientes pueden ingresar';
}

class ServiceUnavailableError extends AuthError {
  type = 'ServiceUnavailableError';
  code = 'service_unavailable';
  message = 'El servicio de autenticación no está disponible.';
}

export async function refreshAccessToken(token: JWT): Promise<JWT> {
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

    // Validar respuesta esperada
    if (!response.data?.data?.access_token) {
      throw new Error('Respuesta de refresh token inválida');
    }

    const { access_token, refresh_token, expires } = response.data.data;

    console.log('✅ Token refreshed successfully');

    return {
      ...token,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + (expires || 300000), // Fallback de 5 min si no hay expires
      error: undefined,
    };
  } catch (error) {
    console.error('❌ Error refreshing access token:', error);
    
    // Si falla el refresh, no retornamos un token parcial con error
    // Forzamos el cierre de sesión retornando null (NextAuth manejará esto invalidando la sesión)
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Directus',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // 1. Validar credentials no sean null/undefined
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const directusUrl =
          process.env.DIRECTUS_INTERNAL_URL ||
          process.env.DIRECTUS_URL ||
          process.env.NEXT_PUBLIC_DIRECTUS_URL;
        if (!directusUrl) {
          throw new Error('DIRECTUS_URL not set');
        }

        try {
          // 2. Llamar a POST /auth/login de Directus
          const authResponse = await authClient.post(
            `${directusUrl}/auth/login`,
            {
              email: credentials.email,
              password: credentials.password,
              mode: 'json',
            }
          );

          const { access_token, refresh_token, expires } = authResponse.data.data;

          // 3. Obtener datos del usuario (Me) y rol
          const meResponse = await authClient.get(`${directusUrl}/users/me`, {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
            params: {
              fields: 'id,first_name,last_name,email,role.name,status',
            },
          });

          const user = meResponse.data.data;

          // Validar estado de la cuenta
          if (user.status !== 'active') {
            throw new InactiveAccountError();
          }

          // 4. Verificar que el usuario tenga rol permitido
          const roleName = user.role?.name;
          const allowedRoles = ['Cliente', 'Administrator', 'Vendedor'];

          if (!roleName || !allowedRoles.includes(roleName)) {
            console.warn(
              `Intento de acceso denegado para usuario ${user.email} con rol ${roleName}`,
            );
            throw new AccessDeniedError();
          }

          // 5. Obtener ID del cliente asociado (Tabla clientes)
          // Buscamos en la colección 'clientes' por email para vincular el usuario de sistema con el registro de negocio
          let clienteId: string | undefined = undefined;
          let vendedorId: string | undefined = undefined;

          try {
            if (roleName === 'Cliente') {
              const clientesResponse = await authClient.get(`${directusUrl}/items/clientes`, {
                headers: {
                  Authorization: `Bearer ${access_token}`,
                },
                params: {
                  filter: {
                    email: {
                      _eq: user.email,
                    },
                  },
                  fields: 'id',
                  limit: 1,
                },
              });

              if (clientesResponse.data.data && clientesResponse.data.data.length > 0) {
                clienteId = clientesResponse.data.data[0].id;
              } else {
                console.warn(
                  `Usuario ${user.email} es Cliente pero no tiene registro en colección 'clientes'`,
                );
              }
            } else if (roleName === 'Vendedor') {
              // Buscar en vendedores por user_id (si existe) o email
              // Primero intentamos por user_id ya que lo acabamos de agregar
              const vendedoresResponse = await authClient.get(`${directusUrl}/items/vendedores`, {
                headers: {
                  Authorization: `Bearer ${access_token}`,
                },
                params: {
                  filter: {
                    _or: [{ user_id: { _eq: user.id } }, { email: { _eq: user.email } }],
                  },
                  fields: 'id',
                  limit: 1,
                },
              });

              if (vendedoresResponse.data.data && vendedoresResponse.data.data.length > 0) {
                vendedorId = vendedoresResponse.data.data[0].id;
              } else {
                console.warn(
                  `Usuario ${user.email} es Vendedor pero no tiene registro en colección 'vendedores'`,
                );
              }
            }
          } catch (error) {
            console.error('Error buscando entidad asociada (cliente/vendedor):', error);
            // No bloqueamos el login si falla esto, pero el usuario tendrá funcionalidad limitada
          }

          return {
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            image: null,
            access_token,
            refresh_token,
            expires_at: Date.now() + expires,
            role: roleName,
            clienteId: clienteId, // ID de negocio para filtrar ventas/pagos
            vendedorId: vendedorId,
          };
        } catch (error: any) {
          console.error('Auth Error:', error);

          // MOCK AUTHENTICATION FALLBACK - Solo si está explícitamente habilitado
          const enableMock = process.env.ENABLE_MOCK_AUTH === 'true';

          // Si Directus está caído (ECONNREFUSED), y MOCK está habilitado
          if (
            enableMock &&
            (error.code === 'ECONNREFUSED' ||
              error.cause?.code === 'ECONNREFUSED' ||
              (error.message && error.message.includes('ECONNREFUSED')))
          ) {
            console.warn('⚠️ Directus unreachable (ECONNREFUSED). Using MOCK authentication.');

            if (credentials.email === 'admin@quintas.com') {
              return {
                id: 'mock-admin-id',
                name: 'Admin Mock',
                email: 'admin@quintas.com',
                image: null,
                access_token: 'mock-admin-token',
                refresh_token: 'mock-admin-refresh-token',
                expires_at: Date.now() + 3600 * 1000,
                role: 'Administrator',
                clienteId: undefined,
                vendedorId: undefined,
              };
            }

            if (credentials.email === 'cliente@quintas.com') {
              return {
                id: 'mock-client-id',
                name: 'Cliente Mock',
                email: 'cliente@quintas.com',
                image: null,
                access_token: 'mock-client-token',
                refresh_token: 'mock-client-refresh-token',
                expires_at: Date.now() + 3600 * 1000,
                role: 'Cliente',
                clienteId: '1', // ID mock
                vendedorId: undefined,
              };
            }
          }

          // Si hay error de conexión y NO hay mock, lanzamos error específico
          if (
            error.code === 'ECONNREFUSED' ||
            error.cause?.code === 'ECONNREFUSED' ||
            (error.message && error.message.includes('ECONNREFUSED'))
          ) {
            throw new ServiceUnavailableError();
          }

          if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
              // Credenciales inválidas
              throw new InvalidCredentialsError();
            }
            if (error.response?.status === 404) {
              // Usuario no encontrado
              throw new UserNotFoundError();
            }
          }

          // Si ya es un error de Auth personalizado, lo relanzamos
          if (error instanceof AuthError) {
            throw error;
          }

          // 7. Si error genérico, retornar null
          return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, account }) {
      // 1. Initial sign in
      if (user && account) {
        return {
          ...token,
          accessToken: user.access_token,
          refreshToken: user.refresh_token,
          expiresAt: user.expires_at,
          role: user.role,
          id: user.id,
          clienteId: user.clienteId,
          vendedorId: user.vendedorId,
        };
      }

      // 2. Return previous token if the access token has not expired yet
      // Add a buffer of 1 minute (60000ms) to refresh before it actually expires
      if (token.expiresAt && Date.now() < (token.expiresAt as number) - 60000) {
        return token;
      }

      // 3. Access token has expired, try to update it
      console.log('🔄 Token expired, refreshing...');
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.clienteId = token.clienteId as string;
        session.user.vendedorId = token.vendedorId as string;
        session.accessToken = token.accessToken as string;
        
        // Pass error to client if exists
        if (token.error) {
          session.error = token.error;
        }
      }
      return session;
    },
  },
});

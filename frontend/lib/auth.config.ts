import type { NextAuthConfig } from 'next-auth';
import { logAccess } from './logger';

export const authConfig = {
  pages: {
    signIn: '/portal/auth/login',
    signOut: '/portal/auth/logout',
    error: '/portal/auth/error',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl, headers } }) {
      const pathname = nextUrl.pathname;
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role || '';

      const isLoginPage = pathname === '/portal/auth/login' || pathname === '/login';
      const isAuthPage = pathname.startsWith('/portal/auth') || pathname === '/login';

      const isOnPortal = pathname.startsWith('/portal');
      const isOnDashboard = pathname.startsWith('/dashboard');
      const isOnDevPortal = pathname.startsWith('/developer-portal');

      const isPublicNonAuth = pathname === '/' || pathname === '/recover' || pathname === '/mapa';

      const isClientRole = role === 'Cliente' || role === 'ROL_CLIENTE';
      const isVendorRole = role === 'Vendedor' || role === 'ROL_VENDEDOR';
      const isAdminRole =
        role === 'Administrator' || role === 'SuperAdmin' || role === 'ROL_ADMIN';

      // Obtener IP (mejor esfuerzo en Edge/Middleware)
      // Nota: headers.get puede no estar disponible en todas las versiones de NextAuth authorized callback
      // pero request es NextRequest.
      const ip = headers?.get('x-forwarded-for') || 'unknown';

      const redirectToLogin = () => Response.redirect(new URL('/login', nextUrl));
      const redirectToClientHome = () => Response.redirect(new URL('/portal', nextUrl));
      const redirectToVendorHome = () => Response.redirect(new URL('/dashboard/ventas', nextUrl));
      const redirectToAdminHome = () => Response.redirect(new URL('/dashboard', nextUrl));

      if (isAuthPage) {
        if (isLoggedIn) {
          if (isAdminRole) return redirectToAdminHome();
          if (isVendorRole) return redirectToVendorHome();
          if (isClientRole) return redirectToClientHome();
          return redirectToLogin();
        }
        return true;
      }

      if (isPublicNonAuth) {
        return true;
      }

      const isInternal = isOnPortal || isOnDashboard || isOnDevPortal;

      if (isInternal && !isLoggedIn) {
        logAccess({
          ip,
          path: pathname,
          action: 'ACCESS_PROTECTED',
          result: 'DENIED',
          details: 'Unauthenticated',
        });
        return redirectToLogin();
      }

      if (isOnPortal) {
        if (!isClientRole && !isAdminRole) {
          logAccess({
            ip,
            userId: auth?.user?.email || auth?.user?.id,
            path: pathname,
            action: 'ACCESS_PROTECTED',
            result: 'DENIED',
            details: `Invalid Role for Portal: ${role}`,
          });

          if (isVendorRole) {
            return redirectToVendorHome();
          }

          return redirectToLogin();
        }

        logAccess({
          ip,
          userId: auth?.user?.email || auth?.user?.id,
          path: pathname,
          action: 'ACCESS_PROTECTED',
          result: 'SUCCESS',
        });

        return true;
      }

      if (isOnDashboard) {
        if (!isAdminRole && !isVendorRole) {
          logAccess({
            ip,
            userId: auth?.user?.email || auth?.user?.id,
            path: pathname,
            action: 'ACCESS_PROTECTED',
            result: 'DENIED',
            details: `Invalid Role for Dashboard: ${role}`,
          });

          if (isClientRole) {
            return redirectToClientHome();
          }

          return redirectToLogin();
        }

        if (isAdminRole) {
          return true;
        }

        const vendorAllowedPrefixes = [
          '/dashboard',
          '/dashboard/ventas',
          '/dashboard/clientes',
          '/dashboard/comisiones',
          '/dashboard/mapa',
        ];

        const isVendorAllowed =
          pathname === '/dashboard' ||
          vendorAllowedPrefixes.some((path) =>
            path === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === path || pathname.startsWith(`${path}/`),
          );

        if (!isVendorAllowed) {
          logAccess({
            ip,
            userId: auth?.user?.email || auth?.user?.id,
            path: pathname,
            action: 'ACCESS_PROTECTED',
            result: 'DENIED',
            details: `Vendor route not allowed: ${pathname}`,
          });
          return redirectToVendorHome();
        }

        logAccess({
          ip,
          userId: auth?.user?.email || auth?.user?.id,
          path: pathname,
          action: 'ACCESS_PROTECTED',
          result: 'SUCCESS',
        });

        return true;
      }

      if (isOnDevPortal) {
        if (!isLoggedIn) {
          logAccess({
            ip,
            path: pathname,
            action: 'ACCESS_PROTECTED',
            result: 'DENIED',
            details: 'Unauthenticated',
          });
          return redirectToLogin();
        }
        return true;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.access_token;
        token.refreshToken = user.refresh_token;
        token.expiresAt = user.expires_at;
        token.role = user.role;
        token.id = user.id;
        token.clienteId = user.clienteId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.accessToken = token.accessToken as string;
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.clienteId = token.clienteId as string | undefined;
      }
      return session;
    },
  },
  providers: [], // Configured in auth.ts
} satisfies NextAuthConfig;

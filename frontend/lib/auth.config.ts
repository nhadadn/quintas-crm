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
      const isLoggedIn = !!auth?.user;
      const isOnPortal = nextUrl.pathname.startsWith('/portal');
      const isLoginPage =
        nextUrl.pathname === '/portal/auth/login' || nextUrl.pathname === '/login';
      const isAuthPage =
        nextUrl.pathname.startsWith('/portal/auth') || nextUrl.pathname === '/login';

      // Obtener IP (mejor esfuerzo en Edge/Middleware)
      // Nota: headers.get puede no estar disponible en todas las versiones de NextAuth authorized callback
      // pero request es NextRequest.
      const ip = headers?.get('x-forwarded-for') || 'unknown';

      // Allow access to login and auth pages without being logged in
      if (isLoginPage || isAuthPage) {
        if (isLoggedIn) {
          // If already logged in, redirect based on role
          const role = auth.user?.role;
          if (role === 'Administrator' || role === 'Vendedor') {
            return Response.redirect(new URL('/dashboard', nextUrl));
          }
          return Response.redirect(new URL('/portal', nextUrl));
        }
        return true;
      }

      // 1. Protect Portal (Clients & Admins)
      if (isOnPortal) {
        if (!isLoggedIn) {
          logAccess({
            ip,
            path: nextUrl.pathname,
            action: 'ACCESS_PROTECTED',
            result: 'DENIED',
            details: 'Unauthenticated',
          });
          return false; // Redirect unauthenticated users to login page
        }

        // Validar rol: Cliente y Administrator tienen acceso
        // Vendedor es redirigido a su dashboard
        if (auth.user?.role !== 'Cliente' && auth.user?.role !== 'Administrator') {
          logAccess({
            ip,
            userId: auth.user?.email || auth.user?.id,
            path: nextUrl.pathname,
            action: 'ACCESS_PROTECTED',
            result: 'DENIED',
            details: `Invalid Role for Portal: ${auth.user?.role}`,
          });

          if (auth.user?.role === 'Vendedor') {
            return Response.redirect(new URL('/dashboard', nextUrl));
          }

          return Response.redirect(new URL('/portal/auth/error?error=AccessDenied', nextUrl));
        }

        logAccess({
          ip,
          userId: auth.user?.email || auth.user?.id,
          path: nextUrl.pathname,
          action: 'ACCESS_PROTECTED',
          result: 'SUCCESS',
        });

        return true;
      }

      // 2. Protect Dashboard (Admins & Vendedores)
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (!isLoggedIn) {
          // Redirigir al login del portal por defecto si no hay otro
          return false;
        }

        if (auth.user?.role !== 'Administrator' && auth.user?.role !== 'Vendedor') {
          logAccess({
            ip,
            userId: auth.user?.email || auth.user?.id,
            path: nextUrl.pathname,
            action: 'ACCESS_PROTECTED',
            result: 'DENIED',
            details: `Invalid Role for Dashboard: ${auth.user?.role}`,
          });

          if (auth.user?.role === 'Cliente') {
            return Response.redirect(new URL('/portal', nextUrl));
          }

          return Response.redirect(new URL('/portal/auth/error?error=AccessDenied', nextUrl));
        }

        return true;
      }

      // 3. Protect Developer Portal (All authenticated users)
      const isOnDevPortal = nextUrl.pathname.startsWith('/developer-portal');
      if (isOnDevPortal) {
        if (!isLoggedIn) {
          logAccess({
            ip,
            path: nextUrl.pathname,
            action: 'ACCESS_PROTECTED',
            result: 'DENIED',
            details: 'Unauthenticated',
          });
          return false;
        }
        return true;
      }

      // 4. Default protection for other routes
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

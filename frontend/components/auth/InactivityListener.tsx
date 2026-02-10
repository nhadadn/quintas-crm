'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes
// const INACTIVITY_LIMIT_MS = 10 * 1000; // 10 seconds for testing

export function InactivityListener() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const checkInactivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    if (timeSinceLastActivity >= INACTIVITY_LIMIT_MS) {
      console.log('⚠️ Inactividad detectada. Cerrando sesión...');
      // Limpiar listeners para evitar múltiples llamadas
      cleanupListeners();
      
      // Cerrar sesión y redirigir
      signOut({ callbackUrl: '/login?reason=inactivity' });
    }
  }, []);

  const setupListeners = () => {
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);
  };

  const cleanupListeners = () => {
    window.removeEventListener('mousemove', handleActivity);
    window.removeEventListener('keydown', handleActivity);
    window.removeEventListener('click', handleActivity);
    window.removeEventListener('scroll', handleActivity);
    window.removeEventListener('touchstart', handleActivity);
  };

  useEffect(() => {
    // Detectar error de refresco de token y cerrar sesión inmediatamente
    if (session?.error === 'RefreshAccessTokenError') {
      console.warn('⚠️ Token de sesión expirado o inválido. Cerrando sesión forzadamente...');
      signOut({ callbackUrl: '/login?reason=session_expired' });
    }
  }, [session]);

  useEffect(() => {
    // Solo activar si hay sesión iniciada y no hay errores
    if (status === 'authenticated' && !session?.error) {
      lastActivityRef.current = Date.now();
      setupListeners();

      // Verificar inactividad cada minuto (o cada segundo si se requiere más precisión/testing)
      timerRef.current = setInterval(checkInactivity, 1000); // Chequeo cada segundo

      return () => {
        cleanupListeners();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [status, handleActivity, checkInactivity]);

  // Renderless component
  return null;
}

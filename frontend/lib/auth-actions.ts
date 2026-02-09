'use server';

/**
 * Server Actions para Autenticación y Gestión de Sesiones.
 * Documentación detallada en: documentacion/ninja/RESUMEN_CAMBIOS_FASE_5.md
 *
 * Incluye:
 * - Login (authenticate)
 * - Recuperación de contraseña (requestPasswordReset, resetPassword)
 * - Logout (signOutAction)
 */

import { signIn } from '@/lib/auth';
import { AuthError, CredentialsSignin } from 'next-auth';
import { directusClient } from './directus-api';
import { z } from 'zod';
import { headers } from 'next/headers';
import { loginRateLimiter } from './rate-limit';
import { logAccess } from './logger';

const SignInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type ActionState = { success: boolean; message: string } | undefined;

export async function authenticate(prevState: string | undefined, formData: FormData) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || 'unknown';

  try {
    const data = Object.fromEntries(formData);
    console.log('[AuthAction] Attempting login for:', data.email);

    const validatedFields = SignInSchema.safeParse(data);

    if (!validatedFields.success) {
      console.log('[AuthAction] Validation failed');
      return validatedFields.error.errors[0]?.message || 'Error de validación.';
    }

    // Rate Limiting Check
    const rateLimit = loginRateLimiter.check(ip);
    if (!rateLimit.success) {
      console.log('[AuthAction] Rate limit exceeded for IP:', ip);
      return 'Demasiados intentos. Por favor intenta de nuevo en 15 minutos.';
    }

    // Intenta iniciar sesión con redirect: false
    try {
       console.log('[AuthAction] Calling signIn with redirect: false');
       const result = await signIn('credentials', {
         ...data,
         redirect: false,
       });
       console.log('[AuthAction] signIn result:', result);

       if (result?.error) {
          console.error('[AuthAction] signIn returned error:', result.error);
          throw new CredentialsSignin();
       }

       console.log('[AuthAction] Login successful');
       return undefined;
     } catch (signInError) {
      console.error('[AuthAction] signIn threw error:', signInError);
      
      // Si el error es AuthError, lo manejamos
      if (signInError instanceof AuthError) {
        throw signInError;
      }
      
      // Si es NEXT_REDIRECT, lo manejamos aquí
      const isRedirect = (signInError as Error).message === 'NEXT_REDIRECT' || 
                         (signInError as any).digest?.startsWith('NEXT_REDIRECT');
      if (isRedirect) {
        console.log('[AuthAction] Caught NEXT_REDIRECT in inner block, returning success');
        return undefined;
      }

      throw signInError;
    }
  } catch (error) {
    console.error('[AuthAction] Outer catch error:', error);

    if (error instanceof AuthError) {
      logAccess({
        ip,
        userId: formData.get('email') as string,
        action: 'LOGIN_ATTEMPT',
        result: 'FAILURE',
        details: error.type,
      });

      switch (error.type) {
        case 'CredentialsSignin':
        case 'CallbackRouteError': // A veces se mapea aquí
          return 'Credenciales inválidas. Verifica tu correo y contraseña.';
        case 'ServiceUnavailableError':
          return 'No se pudo conectar con el servidor de autenticación. Por favor intente más tarde.';
        default:
          return 'Algo salió mal al iniciar sesión.';
      }
    }

    const isRedirect = (error as Error).message === 'NEXT_REDIRECT' || 
                       (error as any).digest?.startsWith('NEXT_REDIRECT');
    
    if (isRedirect) {
      console.log('[AuthAction] Caught NEXT_REDIRECT in outer block, returning success');
      return undefined;
    }

    return 'Error de conexión. Por favor contacta al administrador.';
  }
}

export async function requestPasswordReset(prevState: ActionState, formData: FormData) {
  const email = formData.get('email') as string;

  // Validar formato de email con Zod
  const emailSchema = z.string().email();
  const validation = emailSchema.safeParse(email);

  if (!validation.success) {
    return { success: false, message: 'Por favor ingresa un correo electrónico válido.' };
  }

  // URL base para el reset, asegurando que termine sin slash extra y apunte a la página correcta
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/portal/auth/reset-password`;

  try {
    await directusClient.post('/auth/password/request', {
      email,
      reset_url: resetUrl,
    });

    // Directus siempre retorna 200/204 incluso si el email no existe (por seguridad)
    // Retornamos un mensaje de éxito genérico
    return { success: true, message: 'Si el email existe, recibirás un enlace de recuperación' };
  } catch (error) {
    console.error('Password reset request error:', error);
    return { success: false, message: 'Error al solicitar recuperación. Inténtalo nuevamente.' };
  }
}

export async function resetPassword(prevState: ActionState, formData: FormData) {
  const token = formData.get('token') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirm-password') as string;

  if (!token) return { success: false, message: 'Token inválido o faltante.' };
  if (!password) return { success: false, message: 'La contraseña es requerida.' };
  if (password !== confirmPassword)
    return { success: false, message: 'Las contraseñas no coinciden.' };
  if (password.length < 8)
    return { success: false, message: 'La contraseña debe tener al menos 8 caracteres.' };

  try {
    await directusClient.post('/auth/password/reset', {
      token,
      password,
    });

    return { success: true, message: 'Contraseña actualizada exitosamente.' };
  } catch (error: any) {
    console.error('Password reset error:', error?.response?.data || error);
    return {
      success: false,
      message: 'No se pudo restablecer la contraseña. El enlace puede haber expirado.',
    };
  }
}

export async function signOutAction() {
  const { signOut } = await import('@/lib/auth');
  await signOut({ redirectTo: '/portal/auth/login' });
}

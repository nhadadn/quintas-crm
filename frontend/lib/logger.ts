/**
 * Estructura de log requerida:
 * timestamp, ip, user_id, ruta, resultado
 */
export type LogEntry = {
  ip: string;
  userId?: string;
  path?: string;
  action: string; // 'LOGIN_ATTEMPT', 'ACCESS_PROTECTED', 'ACCESS_DENIED'
  result: 'SUCCESS' | 'FAILURE' | 'DENIED';
  details?: string;
};

export function logAccess({
  ip,
  userId = 'anonymous',
  path = '-',
  action,
  result,
  details = '',
}: LogEntry) {
  const timestamp = new Date().toISOString();
  // Format: [TIMESTAMP] [IP] [USER_ID] [ACTION] [PATH] [RESULT] [DETAILS]
  const logMessage = `[${timestamp}] [${ip}] [${userId}] [${action}] [${path}] [${result}] ${details}`;

  // En un entorno real, esto iría a un servicio de logs (Datadog, CloudWatch, etc.)
  // O a un archivo rotativo con winston/pino.
  // Para este MVP, usamos console.log que Next.js captura.
  if (result === 'SUCCESS') {
    console.log(logMessage);
  } else {
    console.warn(logMessage);
  }
}

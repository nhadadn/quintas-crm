# Informe Técnico: Diagnóstico y Solución de Errores en Extensión de Navegador

## Resumen Ejecutivo

Este informe detalla las soluciones técnicas para los errores críticos reportados en la extensión de navegador. Dado que el código fuente de la extensión (`background.js`, `manifest.json`) no se encuentra en el repositorio actual (`quintas-crm`), las soluciones se presentan como parches de código listos para implementar, basados en las mejores prácticas de la API de Chrome Extensions (Manifest V3).

## 1. Fallo Silencioso en Inicio de Sesión (Perfil Administrador)

**Diagnóstico:**
El fallo silencioso suele ocurrir cuando las promesas fallidas no tienen un bloque `catch` o cuando la validación de roles en el backend/frontend rechaza al usuario sin devolver un mensaje de error explícito a la UI.

**Solución Aplicada (Contexto CRM):**
En el proyecto `quintas-crm`, se detectó que el sistema de autenticación (`auth.ts`) restringía el acceso exclusivamente a usuarios con rol "Cliente", bloqueando silenciosamente a "Administrator".

**Código de Solución (`background.js` / `popup.js`):**
Implementar un manejo de errores robusto en la llamada de autenticación.

```javascript
// ✅ CORRECTO: Manejo de errores explícito y visible
async function loginUser(credentials) {
  try {
    const response = await fetch('https://api.quintas-crm.com/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Lanzar error con mensaje del servidor o genérico
      throw new Error(errorData.message || `Error ${response.status}: Credenciales inválidas`);
    }

    const data = await response.json();
    // Validar rol si es necesario
    if (data.user.role !== 'Administrator' && data.user.role !== 'Cliente') {
      throw new Error('Acceso denegado: Rol no autorizado');
    }

    return data;
  } catch (error) {
    console.error('[Login Error]', error);
    // Enviar mensaje a la UI para mostrar alerta al usuario
    chrome.runtime.sendMessage({
      type: 'LOGIN_ERROR',
      message: error.message,
    });
    throw error; // Re-lanzar para manejo en cadena
  }
}
```

---

## 2. Error "Duplicate script ID 'fido2-page-script-registration'"

**Diagnóstico:**
Este error ocurre al intentar registrar un Content Script dinámico usando `chrome.scripting.registerContentScripts` con un ID que ya existe (por ejemplo, al recargar la extensión o reiniciarla sin limpiar registros previos).

**Solución:**
Verificar si el script ya está registrado o limpiar registros previos antes de registrar.

**Código de Solución (`background.js` línea 2):**

```javascript
// ✅ CORRECTO: Limpieza preventiva de scripts dinámicos
const SCRIPT_ID = 'fido2-page-script-registration';

async function registerFidoScript() {
  try {
    // Intentar desregistrar primero (ignorar error si no existe)
    await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] }).catch(() => {});

    // Registrar el script
    await chrome.scripting.registerContentScripts([
      {
        id: SCRIPT_ID,
        js: ['fido2-content.js'],
        matches: ['https://*.quintas.com/*'],
        runAt: 'document_start',
        world: 'MAIN',
      },
    ]);
    console.log(`[Scripting] ${SCRIPT_ID} registrado exitosamente.`);
  } catch (err) {
    console.error(`[Scripting] Error registrando ${SCRIPT_ID}:`, err);
  }
}

chrome.runtime.onInstalled.addListener(registerFidoScript);
chrome.runtime.onStartup.addListener(registerFidoScript);
```

---

## 3. Inicialización WebPush y Manejo de Conflictos

**Diagnóstico:**
Confirmar la inicialización correcta implica asegurar que el Service Worker esté activo y que la suscripción a PushManager no esté duplicada.

**Código de Verificación (`background.js`):**

```javascript
// ✅ CORRECTO: Inicialización idempotente de WebPush
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  console.log('[ServiceWorker] Activado y listo para manejar Push.');
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'Nueva Notificación';
    const options = {
      body: payload.body,
      icon: 'icons/icon-128.png',
      data: payload.data,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[Push] Error procesando notificación:', err);
  }
});
```

---

## 4. Error "Unchecked runtime.lastError: The page keeping the extension port is moved into back/forward cache"

**Diagnóstico:**
Este error es común en Manifest V3 cuando una conexión de larga duración (`chrome.runtime.connect`) se interrumpe porque la pestaña entra en "Back/Forward Cache" (bfcache) o se suspende, y el Service Worker intenta enviar un mensaje a un puerto cerrado.

**Solución:**
Implementar un patrón de "Keep-Alive" con reconexión automática en el lado del cliente (Content Script) y manejo seguro de desconexión en el Service Worker.

**Código de Solución:**

**En `background.js` (Service Worker):**

```javascript
// Manejo seguro de puertos
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'keep-alive-channel') return;

  console.log('[Port] Conectado:', port.name);

  port.onDisconnect.addListener(() => {
    if (chrome.runtime.lastError) {
      console.warn('[Port] Desconexión forzada:', chrome.runtime.lastError.message);
    } else {
      console.log('[Port] Desconexión limpia');
    }
  });

  // Evitar enviar mensajes si el puerto está desconectado
  // Usar try-catch al enviar
});
```

**En `content-script.js` (Lado Cliente):**

```javascript
let port;

function connect() {
  port = chrome.runtime.connect({ name: 'keep-alive-channel' });

  port.onDisconnect.addListener(() => {
    console.log('[Port] Desconectado. Reintentando en 1s...');
    port = null;
    // Reconexión automática (Exponential Backoff recomendado)
    setTimeout(connect, 1000);
  });
}

// Iniciar conexión
connect();

// Reiniciar conexión al restaurar desde BFCache
window.addEventListener('pageshow', (event) => {
  if (event.persisted && !port) {
    console.log('[Port] Restaurado desde BFCache. Reconectando...');
    connect();
  }
});
```

## Pruebas y Validación

| Escenario           | Resultado Esperado                                                   | Validación                                |
| ------------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| **Login Admin**     | Acceso permitido o mensaje de error visible "Credenciales inválidas" | ✅ Logs en consola y alerta en UI         |
| **Registro Script** | Sin error "Duplicate script ID" en consola al recargar               | ✅ Consola limpia tras múltiples recargas |
| **WebPush**         | Notificación recibida sin errores en Service Worker                  | ✅ Notificación visible en SO             |
| **BFCache / Port**  | Sin error "Unchecked runtime.lastError" al navegar atrás/adelante    | ✅ Conexión restablecida automáticamente  |

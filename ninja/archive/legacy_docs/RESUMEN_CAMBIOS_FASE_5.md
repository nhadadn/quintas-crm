# Resumen de Cambios - Fase 5: Portal de Clientes

**Fecha:** 2 de Febrero de 2026
**Versión:** 0.3.0

## 1. Visión General

Este documento resume los cambios técnicos y funcionales implementados durante los Sprints 5.1 y 5.2, estableciendo la base segura para el Portal de Clientes.

## 2. Implementación de Autenticación (Sprint 5.1)

### Arquitectura

- **Framework:** NextAuth.js v5 (Auth.js).
- **Proveedor:** `credentials` conectado a Directus API.
- **Sesiones:** JWT Stateless (sin persistencia en DB del frontend).
- **Seguridad:**
  - Encriptación de tokens.
  - Protección de rutas `/portal` mediante Middleware.
  - Rate Limiting en intentos de login.

### Archivos Clave

- `frontend/lib/auth.ts`: Configuración principal del proveedor. Incluye lógica para enriquecer la sesión con `clienteId` consultando la colección `clientes` de Directus.
- `frontend/lib/auth.config.ts`: Definición de callbacks (jwt, session) y reglas de redirección.
- `frontend/middleware.ts`: Guardian de rutas. Redirige usuarios no autenticados a `/login`.

## 3. Gestión de Credenciales y Recuperación (Sprint 5.2)

### Refactorización de Server Actions

Se centralizó toda la lógica de mutación en un único archivo para mejorar mantenibilidad:

- **Archivo:** `frontend/lib/auth-actions.ts`
- **Funciones:**
  - `authenticate()`: Login con validación Zod y Rate Limiting.
  - `requestPasswordReset()`: Solicitud de cambio de contraseña (envía email).
  - `resetPassword()`: Cambio efectivo de contraseña con token.
  - `signOutAction()`: Cierre de sesión seguro.

### Componentes de UI

- `frontend/components/auth/RecoverPasswordForm.tsx`: Formulario de solicitud.
- `frontend/components/auth/ResetPasswordForm.tsx`: Formulario de cambio de contraseña.
- `frontend/app/portal/layout.tsx`: Layout principal que valida la sesión antes de renderizar contenido.

## 4. Gestión de Pagos (Sprint 5.3 / T5.7)

### Funcionalidades

- **Historial de Pagos:** Vista consolidada de todas las amortizaciones de las ventas del cliente.
- **Tabla Interactiva:**
  - Filtrado por estado (Pagado, Pendiente, Vencido).
  - Búsqueda en tiempo real.
  - Ordenamiento por columnas.
- **Integración:** Consume datos de `getPerfilCliente` que agrega información de todas las ventas asociadas al usuario.

### Componentes Clave

- `app/portal/pagos/page.tsx`: Página principal, fetch de datos seguro.
- `components/portal/pagos/TablaPagosCliente.tsx`: Componente de tabla con lógica de filtrado y paginación.

## 5. Estado Actual del Código

### Funcionalidades Operativas

✅ **Login:** Funcional contra usuarios de Directus.
✅ **Sesión:** El objeto `session.user` ahora contiene `clienteId` y `role`.
✅ **Protección:** Rutas `/portal/*` inaccesibles sin login.
✅ **Recuperación:** Flujo completo de "Olvidé mi contraseña" integrado con endpoints nativos de Directus.
✅ **Pagos:** Historial completo visible para el cliente.

### Estructura de Carpetas Relevante

```
frontend/
├── app/
│   ├── login/              # Página de Login
│   └── portal/             # Rutas protegidas
│       ├── (dashboard)/    # Layout del dashboard
│       ├── pagos/          # Módulo de Pagos
│       └── auth/           # Rutas de recuperación
├── lib/
│   ├── auth.ts             # Config NextAuth
│   ├── auth-actions.ts     # Actions (Login/Reset/Logout)
│   ├── perfil-api.ts       # API Perfil Cliente
│   └── pagos-helpers.ts    # Utilidades de cálculo
└── middleware.ts           # Protección de rutas
```

## 6. Próximos Pasos (Continuación de Fase 5)

1. **Desarrollo de Dashboard (T5.2):** Completar widgets de resumen en Home.
2. **Descarga de Documentos (T5.8):** Listar y permitir descarga de archivos adjuntos.
3. **Perfil de Usuario (T5.5):** Edición de datos personales.

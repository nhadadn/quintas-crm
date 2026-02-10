# Plan de Implementación Inicial - Fase 5: Portal de Clientes

**Proyecto:** Quintas ERP Inmobiliario
**Fase:** 5 - Portal de Clientes
**Estado:** En Progreso (Sprint 5.1 Completado)
**Fecha:** 31 de Enero de 2026

## 1. Objetivos de la Fase

El objetivo principal es implementar un portal seguro y autogestionable donde los clientes de Quintas puedan:

1.  Consultar su estado de cuenta en tiempo real.
2.  Visualizar el avance de su lote y proyecto.
3.  Descargar documentos digitales (recibos, contratos, facturas).
4.  Recibir notificaciones sobre pagos y vencimientos.
5.  Actualizar su información de perfil.

## 2. Arquitectura Propuesta

### 2.1 Frontend (Next.js App Router)

- **Ruta base:** `/portal` (separado del dashboard administrativo `/admin` o `/dashboard`).
- **Autenticación:** `NextAuth.js` (v5) con proveedor de credenciales personalizado contra Directus.
- **Gestión de Estado:** `React Query` para fetching de datos y caché.
- **UI:** Componentes reutilizables de Shadcn/UI, optimizados para móvil (Responsive First).

### 2.2 Backend (Directus & Node.js)

- **Autenticación:** Uso de roles y permisos de Directus (`Rol: Cliente`).
- **Endpoints:** Reutilización de endpoints existentes (`/reportes/estado-cuenta-cliente`) y creación de nuevos específicos para el perfil.
- **Seguridad:** Validación estricta de propiedad (un cliente solo puede ver SUS datos).

## 3. Desglose de Tareas (Roadmap)

### T5.1: Autenticación y Seguridad ✅

- [x] Configurar NextAuth.js en el frontend.
- [x] Crear rol "Cliente" en Directus con permisos de lectura limitados (propiedad `user_created` o campo relacional).
- [x] Implementar flujo de Login con correo y contraseña.
- [x] Implementar flujo de "Recuperar Contraseña" (envío de email con token).
- [x] Crear middleware para proteger rutas `/portal/*`.
- [x] Implementar Enriquecimiento de Sesión con `clienteId` (T5.1.5).

### T5.2: Dashboard del Cliente (Home) ⏳

- [x] Implementar Layout base del Portal con Navbar y verificación de sesión.
- [ ] Diseño de vista resumen: Saldo pendiente, próximo pago, estatus del lote.
- [ ] Integración con endpoint `/reportes/estado-cuenta-cliente` (modo JSON).
- [ ] Widget de "Avisos Importantes" (notificaciones globales o personales).

### T5.3: Estado de Cuenta y Pagos

- [ ] Vista detallada de historial de pagos.
- [ ] Visualización de tabla de amortización.
- [ ] Botón para descargar Estado de Cuenta (PDF) usando el endpoint de reportes existente.
- [ ] (Opcional) Integración con pasarela de pagos (Stripe/PayPal) para "Pagar Ahora".

### T5.4: Documentos Digitales

- [ ] Sección "Mis Documentos".
- [ ] Listado de archivos adjuntos al cliente/venta en Directus.
- [ ] Visualizador de PDF integrado o descarga directa.
- [ ] Generación on-demand de recibos de pago.

### T5.5: Perfil y Configuraciones

- [ ] Formulario de edición de datos personales (teléfono, dirección).
- [ ] Cambio de contraseña.
- [ ] Preferencias de notificación (Email, SMS, WhatsApp).

### T5.7: Gestión de Pagos ✅

- [x] Crear página `/portal/pagos` protegida.
- [x] Implementar tabla interactiva de historial de pagos.
- [x] Filtrado (Pagado/Pendiente/Vencido) y Búsqueda.
- [x] Paginación y Ordenamiento.
- [x] Integración con API de perfil (`getPerfilCliente`) y agregación de pagos.
- [x] Navegación actualizada (Navbar).

### T5.8: Gestión de Documentos (Contratos, Recibos) ⏳

- [ ] Crear página `/portal/documentos`.
- [ ] Listado de archivos adjuntos (Contratos, Recibos).
- [ ] Implementar descarga segura de documentos.
- [ ] Filtros por tipo y fecha.

## 4. Estrategia de Testing

### 4.1 Unit Testing

- Tests para componentes de UI (botones, formularios).
- Tests para utilidades de formato de moneda y fechas.

### 4.2 Integration Testing

- Validar flujo de autenticación (Login/Logout).
- Verificar que el cliente A NO pueda ver datos del cliente B (Tenant isolation a nivel de usuario).

### 4.3 E2E Testing (Cypress/Playwright)

- Flujo completo: Login -> Ver Estado de Cuenta -> Descargar PDF -> Logout.

## 5. Riesgos y Mitigaciones

| Riesgo                  | Impacto | Mitigación                                                                       |
| ----------------------- | ------- | -------------------------------------------------------------------------------- |
| **Exposición de datos** | Crítico | Implementar Row Level Security (RLS) en Directus y validar IDs en cada endpoint. |
| **Performance**         | Medio   | Usar caché en endpoints de reportes y `staleTime` en React Query.                |
| **UX Móvil**            | Alto    | Diseñar Mobile-First y probar en dispositivos reales.                            |

## 6. Próximos Pasos Inmediatos

1.  Crear rama `feature/fase-5-portal-clientes`.
2.  Configurar NextAuth y variables de entorno.
3.  Definir el Rol "Cliente" en Directus y asignar permisos de prueba.

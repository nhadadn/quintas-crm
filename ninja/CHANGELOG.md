# Changelog - Quintas CRM

## 0.4.0 - Fortalecimiento Documental y Roadmap Final (Fases 5, 7 y 8)

- **Documentación Integral V2:**
  - Establecimiento de `RetornoDeProyecto/v2/DOCUMENTACION_INTEGRAL_V2.md` como Single Source of Truth.
  - Creación de `DOCUMENTACION_CAMBIOS_RECIENTES.md` para bitácora de decisiones estratégicas.
  - Actualización de `README.md` con enlaces directos a la nueva estructura documental.
- **Redefinición de Roadmap:**
  - **Fase 5 (Portal):** Optimización para uso de NextAuth.js v5 Beta y autenticación híbrida.
  - **Fase 7 (Testing):** Inclusión formal de fase de pruebas automatizadas (Jest/Playwright).
  - **Fase 8 (Ops):** Definición de estrategia de despliegue y monitoreo.
- **Backend Core Updates (CRM Logic):**
  - **Endpoint Pagos:** Implementación de Rate Limiting en memoria y validación Zod.
  - **Hook CRM:** Lógica anti-doble venta (validación estricta de estatus 'disponible').
  - **Comisiones:** Endpoint de cálculo automático basado en perfil de vendedor.
- **Auditoría de Calidad:**
  - Implementación de `PROMPT_AUDITORIA_VALIDACION_FASES.md` como Quality Gate obligatorio.

## 0.3.1 - Refactorización de Arquitectura de Extensiones y Mapa Interactivo

- **Optimización de Endpoints:**
  - Implementación de `/mapa-lotes` con respuesta GeoJSON optimizada para mejorar rendimiento de carga del mapa.
  - Health checks (`/ping`) añadidos para servicios críticos de mapa.
  - Enriquecimiento de respuesta GeoJSON con metadatos completos (`created_at`, `latitud`, `longitud`).
- **Arquitectura de Extensiones (Fixes Críticos):**
  - Estandarización de patrón de carga de extensiones (Proxy Entry Files) para resolver errores `ERR_MODULE_NOT_FOUND` en Windows.
  - Implementación de soporte híbrido ESM/CommonJS para extensiones modernas.
  - Resolución de conflictos de enrutamiento mediante simplificación de nombres en `package.json` (`mapa-lotes`, `clientes`).
- **Integración Frontend:**
  - Actualización de `directus-api.ts` para consumo prioritario del endpoint optimizado.
  - Manejo robusto de errores 404/403 con fallbacks inteligentes.

## 0.3.0 - Fase 5: Portal de Clientes (Seguridad y Acceso)

- **Autenticación Robusta:**
  - Implementación de `NextAuth.js v5` con proveedor de credenciales Directus.
  - Manejo de sesiones JWT stateless con encriptación.
  - Enriquecimiento de sesión con `clienteId` para contexto de negocio automático.
- **Seguridad:**
  - Middleware de protección de rutas `/portal/*`.
  - Implementación de Row-Level Security (RLS) en Directus para rol Cliente.
  - Validaciones estrictas de servidor (Zod) en todos los formularios de auth.
- **Funcionalidad de Usuario:**
  - Flujo completo de Login y Logout.
  - Recuperación de contraseña integrada con backend (Solicitud + Reset).
  - UI responsiva para páginas de autenticación.
  - **Módulo de Pagos:**
    - Vista de historial completo de pagos.
    - Tabla interactiva con filtros, búsqueda y paginación.
    - Estado visual de pagos (Pagado/Pendiente/Vencido/Mora).
- **Infraestructura Frontend:**
  - Layout base del Portal con verificación de sesión.
  - Centralización de Server Actions para autenticación.

## 0.2.8 - Validación Integral de Backend (Seguridad y Calidad)

- Implementación de suite de validación completa (`npm test`).
- Cobertura de tests para flujos críticos:
  - Ventas: Creación, amortización, triggers.
  - Pagos: Mora automática, actualización de saldos, liquidación.
  - Clientes: Validación de duplicados (Email/RFC).
- Auditoría de Seguridad:
  - Verificación de Rate Limiting (100 req/min).
  - Protección contra SQL Injection validada.
  - Contexto de Autenticación (JWT) asegurado.
- Documentación técnica actualizada:
  - `ESQUEMA_BASE_DATOS_ERP.md` creado.
  - `API_BACKEND_ERP.md` estandarizado.
  - `openapi-spec.yaml` sincronizado.

## 0.2.0 - Migración inicial a S G (estructura)

- Añadida estructura de componentes SVG en `frontend/components/mapa-svg/`.
- Añadidas utilidades SVG en `frontend/lib/svg/`.
- Creado archivo de tipos `frontend/types/svg.ts`.
- Añadido `frontend/public/mapas/mapa-quintas.svg` como placeholder inicial.
- Actualizado `frontend/package.json`:
  - Eliminadas dependencias: `mapbox-gl`, `@types/mapbox-gl`, `proj4`.
  - Añadidas dependencias: `react-svg`, `xml2js`, `@types/xml2js`.
- Añadidos scripts de utilidad en `/scripts`:
  - `analyze-svg.ts`
  - `map-lotes-to-svg.ts`
  - `prepare-db-update.ts`
- Documentación actualizada:
  - `README.md` con sección de migración a SVG.
  - `MIGRATION-SVG.md` con guía de migración.

## 0.1.0 - Versión inicial

- Backend Directus configurado en la raíz del proyecto.
- Frontend Next.js 14 con TypeScript y Tailwind en `frontend/`.
- Mapa interactivo inicial basado en Mapbox GL JS.
- Tipos y cliente de API para lotes (`frontend/types/lote.ts`, `frontend/lib/directus-api.ts`).

# Cambios y Mejoras Integrales – Versión 0.3.0 (Feb 2026)

## Resumen Ejecutivo

Se consolidaron mejoras clave en base de datos, extensiones Directus, frontend (Next.js) y calidad (testing). Destacan: soporte de pagos parciales, validaciones robustas en pagos manuales, nuevas vistas de dashboard, endurecimiento de RBAC y suite de pruebas de frontend al 100% (282/282).

## Alcance de la Versión

- Objetivo: Fortalecer el flujo financiero (pagos y amortización), observabilidad de KPIs y confiabilidad del frontend.
- Resultado: Motor de pagos con ledger consistente, endpoints de dashboard ampliados y documentación de estado actualizada.

## Base de Datos

- Migraciones nuevas añadidas:
  - 020_fix_status_and_constraints.sql
  - 021_pago_propagation_trigger.sql
  - 022_support_partial_payments.sql
  - 023_backfill_pagos_movimientos.sql
  - 024_dashboard_view.sql
  - 025_performance_indexes.sql
  - 026_fix_triggers_group_by.sql
  - 027_add_post_process_status_to_ventas.sql
  - 028_fix_rbac_vendedor_policy.sql
  - 029_fix_rbac_clientes_lotes.sql
- Enfoque:
  - Soporte de pagos parciales y propagación de estados mediante triggers.
  - Vistas de dashboard para KPIs y reportes.
  - Correcciones de RBAC (vendedores y clientes) y nuevos índices de performance.

## Lógica de Pagos y Amortización (Frontend)

- Archivo clave: [pagos-api.ts](file:///c:/Users/nadir/quintas-crm/frontend/lib/pagos-api.ts)
  - registrarPagoManual:
    - Requiere `venta_id` y valida existencia de cuotas en `amortizacion` antes de registrar.
    - Inserta movimiento en `/items/pagos_movimientos` determinando la próxima cuota pendiente.
    - Modo extensión: usa endpoints de Directus; fallback: inserta directamente en ledger.
  - marcarComoPagado:
    - Obtiene el pago, calcula monto pendiente y delega a `registrarPagoManual`.
    - Mensajes de error en español para usuarios; logs técnicos en inglés cuando aplica.
- UI/UX relacionados:
  - Componente: [ModalRegistrarPago.tsx](file:///c:/Users/nadir/quintas-crm/frontend/components/pagos/ModalRegistrarPago.tsx) actualizado para alinear con las validaciones y flujos.
  - Tabla de amortización: [TablaAmortizacion.tsx](file:///c:/Users/nadir/quintas-crm/frontend/components/gestion/TablaAmortizacion.tsx).

## Extensiones Directus

- Ventas API: [extensions/ventas-api/src/index.js](file:///c:/Users/nadir/quintas-crm/extensions/ventas-api/src/index.js)
  - Acepta variantes de naming en payload y coerción numérica segura.
  - Mensajes de error en español para usuario final.
- Endpoint Pagos: [extensions/endpoint-pagos/src](file:///c:/Users/nadir/quintas-crm/extensions/endpoint-pagos/src/index.js)
  - Manejo robusto de webhooks Stripe y servicios relacionados (`webhook-service.js`, `stripe-service.js`).
  - Ajustes en package.json para scripts y despliegue.
- Hook CRM Logic: [directus-extension-hook-crm-logic](file:///c:/Users/nadir/quintas-crm/extensions/directus-extension-hook-crm-logic/src)
  - Servicios de amortización refinados y pruebas ampliadas.

## Frontend (Next.js)

- API Routes (App Router) para dashboard y finanzas:
  - Directorio: [frontend/app/api/dashboard/](file:///c:/Users/nadir/quintas-crm/frontend/app/api/dashboard)
  - Endpoints clave: `kpis`, `ventas-por-mes`, `ventas-por-vendedor`, `pagos-por-estatus`, `lotes-por-estatus`, `ventas-recientes`.
- Componentes actualizados:
  - Dashboard: [DashboardPrincipal.tsx](file:///c:/Users/nadir/quintas-crm/frontend/components/dashboard/DashboardPrincipal.tsx), [TablaPagosRecientes.tsx](file:///c:/Users/nadir/quintas-crm/frontend/components/dashboard/TablaPagosRecientes.tsx), [TablaSolicitudesReembolso.tsx](file:///c:/Users/nadir/quintas-crm/frontend/components/dashboard/TablaSolicitudesReembolso.tsx).
  - Portal y Autenticación: componentes en `frontend/components/auth/*` con mensajes consistentes en español.
- Librerías y helpers de API: `frontend/lib/*-api.ts` con manejo estándar de tokens y errores.

## QA y Testing

- Unit (Vitest): 282/282 pruebas aprobadas.
  - Comando: `cd frontend && npm run test:unit`
  - Pruebas de pagos ajustadas para nuevas validaciones: [pagos-api.test.ts](file:///c:/Users/nadir/quintas-crm/frontend/tests/unit/lib/pagos-api.test.ts)
- E2E (Playwright): reportes en `frontend/playwright-report/`.
- Backend: pruebas en `tests/backend` para endpoints de dashboard y lógica de negocio.

## DevOps/CI y Calidad

- Husky + lint-staged activos para formato y lint.
- Nota: Una configuración ESLint en `paquete_contexto_completo` extiende `next/core-web-vitals` y puede no resolver dependencias locales. Recomendación: ajustar lint-staged para ignorar `paquete_contexto_*` o instalar las dependencias necesarias si se usan esos paquetes.

## Seguridad y Cumplimiento

- RBAC corregido y endurecido para vendedores/clientes (migraciones 028–029).
- Manejo de errores: mensajes en español para usuario final; logs técnicos en inglés.
- Autenticación: flujos de refresh y expiración documentados en [frontend/docs/AUTHENTICATION.md](file:///c:/Users/nadir/quintas-crm/frontend/docs/AUTHENTICATION.md).

## Procedimiento de Actualización

1. Respaldar base de datos.
2. Aplicar migraciones 020 → 029 en orden.
3. Reiniciar servicios de Directus y verificar vistas/índices.
4. Frontend:
   - `cd frontend && npm install`
   - `npm run test:unit` (verificar verde)
5. Validar endpoints de dashboard y flujo de pagos con un pago parcial de prueba.

## Guía Rápida para Colaboradores

- Leer el resumen de cambios: [CHANGELOG.md](file:///c:/Users/nadir/quintas-crm/CHANGELOG.md)
- Estado/alcance: [ESTADO_PROYECTO_Y_ALCANCE.md](file:///c:/Users/nadir/quintas-crm/documentacion/ninja/ESTADO_PROYECTO_Y_ALCANCE.md)
- Puntos de entrada:
  - Lógica de pagos: [pagos-api.ts](file:///c:/Users/nadir/quintas-crm/frontend/lib/pagos-api.ts)
  - Componentes de pagos: [ModalRegistrarPago.tsx](file:///c:/Users/nadir/quintas-crm/frontend/components/pagos/ModalRegistrarPago.tsx)
  - Extensión ventas API: [index.js](file:///c:/Users/nadir/quintas-crm/extensions/ventas-api/src/index.js)
  - Endpoint pagos (Stripe): [src/](file:///c:/Users/nadir/quintas-crm/extensions/endpoint-pagos/src)

## Breaking Changes

- registrarPagoManual exige `venta_id` y cuotas existentes; de lo contrario, falla con mensaje claro.
- Flujos de “marcar como pagado” delegan en ledger de movimientos, afectando integraciones que esperaban inserción directa en `pagos`.

## Referencias

- Changelog: [CHANGELOG.md](file:///c:/Users/nadir/quintas-crm/CHANGELOG.md)
- Arquitectura: [ARCHITECTURE.md](file:///c:/Users/nadir/quintas-crm/ninja/ARCHITECTURE.md)
- Autenticación: [AUTHENTICATION.md](file:///c:/Users/nadir/quintas-crm/frontend/docs/AUTHENTICATION.md)


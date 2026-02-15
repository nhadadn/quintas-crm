# Changelog

Todas las modificaciones notables de este proyecto se documentarán en este archivo.

## [0.3.0] - 2026-02-15

### Resumen
- Se robusteció el flujo de Pagos Manuales con validaciones de negocio (venta y amortización).
- Se agregaron migraciones de base de datos para soportar pagos parciales, vistas de dashboard y mejoras de RBAC.
- Se ampliaron endpoints y páginas del Dashboard en el frontend, y se reforzó la suite de tests unitarios.
- Se actualizó la documentación funcional y técnica para facilitar el trabajo colaborativo.

### Base de Datos
- Nuevas migraciones:
  - `020_fix_status_and_constraints.sql`
  - `021_pago_propagation_trigger.sql`
  - `022_support_partial_payments.sql`
  - `023_backfill_pagos_movimientos.sql`
  - `024_dashboard_view.sql`
  - `025_performance_indexes.sql`
  - `026_fix_triggers_group_by.sql`
  - `027_add_post_process_status_to_ventas.sql`
  - `028_fix_rbac_vendedor_policy.sql`
  - `029_fix_rbac_clientes_lotes.sql`
- Se añadieron índices de performance y vistas para KPIs del dashboard.
- Se corrigieron políticas RBAC para vendedores y clientes.

### Extensiones (Directus)
- `extensions/ventas-api/src/index.js`:
  - Se aceptan variantes de nombres en el payload y se realiza coerción numérica.
  - Se documentaron mensajes de error en español para usuarios finales.
- `extensions/endpoint-pagos`:
  - Ajustes en `package.json` y mejoras en `webhook-service.js` e `index.js` para manejo robusto de webhooks de Stripe.
- `extensions/directus-extension-hook-crm-logic`:
  - Actualizaciones en `amortizacion.service.js` e incorporación de pruebas en `tests/amortizacion.service.test.js`.

### Frontend (Next.js)
- Nuevos/actualizados endpoints de API en `frontend/app/api/dashboard/*` para KPIs y tablas (ventas, pagos, comisiones, lotes).
- Mejora de formularios y flujo de autenticación en componentes `auth/*` incluyendo mensajes de error claros en español.
- Componentes de Dashboard actualizados: `DashboardPrincipal`, `RecentSalesTable`, `TablaPagosRecientes`, `TablaSolicitudesReembolso`, `TablaAmortizacion`.
- Nuevos helpers y clientes de API (`lib/*-api.ts`) con manejo de errores estandarizado y soporte de token.
- Ajustes de accesibilidad y UI en `components/ui/button.tsx` y páginas de portal.

### Lógica de Pagos (Frontend)
- `lib/pagos-api.ts`:
  - `registrarPagoManual` ahora exige `venta_id` y verifica existencia de cuotas en `amortizacion`.
  - Inserta movimientos en `items/pagos_movimientos` determinando la próxima cuota pendiente.
  - `marcarComoPagado` delega a `registrarPagoManual` con validaciones.
- Tests actualizados: `tests/unit/lib/pagos-api.test.ts` para reflejar las nuevas validaciones y endpoints.

### QA y Pruebas
- Suite de pruebas unitarias de frontend expandida (Vitest). Todas las pruebas unitarias pasan: 282/282.
- Reportes de Playwright generados en `frontend/playwright-report/`.
- Pruebas backend disponibles en `tests/backend`.

### Documentación
- `documentacion/ninja/ESTADO_PROYECTO_Y_ALCANCE.md`: Se añadió sección de “Cambios recientes”.
- `frontend/docs/AUTHENTICATION.md`: Alineado con flujos de error y refresco de tokens.
- `ninja/ARCHITECTURE.md`: Actualizado con flujo de pagos y amortización.

### Consideraciones
- Las nuevas validaciones de pagos requieren que el cliente provea `venta_id` válido y que la venta tenga cuotas de amortización.
- Se unificó el manejo de errores para mostrar mensajes en español a usuarios finales y logs técnicos en inglés.

[0.3.0]: 2026-02-15

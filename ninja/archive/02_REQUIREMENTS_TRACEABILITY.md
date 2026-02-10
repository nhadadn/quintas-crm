# Trazabilidad de Requisitos - Quintas-CRM

Este documento mapea los requisitos del "Prompt Maestro" a los componentes técnicos implementados.

## Fase 4: Dashboards y Reportes

| ID Req     | Descripción                 | Componente Backend                       | Componente Frontend            | Estado   |
| ---------- | --------------------------- | ---------------------------------------- | ------------------------------ | -------- |
| **T4.1.1** | Endpoint KPIs Generales     | `GET /dashboard/kpis`                    | `KPICard.tsx`, `StatsCard.tsx` | ✅ Impl. |
| **T4.1.2** | Endpoint Ventas por Mes     | `GET /dashboard/ventas-por-mes`          | `GraficoVentasPorMes.tsx`      | ✅ Impl. |
| **T4.1.3** | Endpoint Ranking Vendedores | `GET /dashboard/ventas-por-vendedor`     | `GraficoVentasPorVendedor.tsx` | ✅ Impl. |
| **T4.1.4** | Endpoint Pagos por Estatus  | `GET /dashboard/pagos-por-estatus`       | `GraficoPagosPorEstatus.tsx`   | ✅ Impl. |
| **T4.1.5** | Endpoint Lotes por Estatus  | `GET /dashboard/lotes-por-estatus`       | `GraficoLotesPorEstatus.tsx`   | ✅ Impl. |
| **T4.1.6** | Endpoint Comisiones         | `GET /dashboard/comisiones-por-vendedor` | `TablaRankingVendedores.tsx`   | ✅ Impl. |
| **T4.2.1** | Reporte Ventas Detallado    | `GET /reportes/ventas-detallado`         | Botón Exportar PDF/Excel       | ✅ Impl. |
| **T4.2.2** | Reporte Histórico Pagos     | `GET /reportes/pagos-historico`          | Botón Exportar                 | ✅ Impl. |
| **T4.2.4** | Estado de Cuenta Cliente    | `GET /reportes/estado-cuenta-cliente`    | Botón Exportar                 | ✅ Impl. |
| **T4.3.1** | Dashboard Principal UI      | N/A                                      | `DashboardPrincipal.tsx`       | ✅ Impl. |
| **T4.4.1** | Página Dashboard            | N/A                                      | `app/dashboard/page.tsx`       | ✅ Impl. |

## Fase 3: Finanzas (Referencia)

| ID Req   | Descripción          | Componente Backend           | Componente Frontend         | Estado   |
| -------- | -------------------- | ---------------------------- | --------------------------- | -------- |
| **T3.1** | Generar Amortización | `POST /amortizacion/generar` | `TablaAmortizacion.tsx`     | ✅ Impl. |
| **T3.2** | Calcular Comisiones  | `POST /comisiones/calcular`  | `CalculadoraComisiones.tsx` | ✅ Impl. |

## Fase 5: Portal de Clientes (Planeado)

| ID Req   | Descripción            | Componente Backend (Plan)     | Componente Frontend (Plan)  | Estado   |
| -------- | ---------------------- | ----------------------------- | --------------------------- | -------- |
| **T5.1** | Autenticación Clientes | `POST /auth/login` (Directus) | `NextAuth`, `LoginPage.tsx` | 📅 Pend. |
| **T5.2** | Home del Cliente       | `GET /reportes/estado-cuenta` | `PortalHome.tsx`            | 📅 Pend. |
| **T5.3** | Descarga Documentos    | `GET /files`                  | `DocumentList.tsx`          | 📅 Pend. |

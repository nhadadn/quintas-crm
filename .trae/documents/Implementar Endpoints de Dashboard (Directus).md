# Objetivo

Implementar 6 endpoints de agregación bajo /dashboard en Directus para KPIs y reportes de ventas, pagos, lotes y comisiones, con filtros y caché de 5 minutos.

## Contexto Verificado

- Backend: Directus ^11.14 con endpoints existentes de ventas, pagos, comisiones, clientes, vendedores y mapa-lotes. No existe /dashboard dedicado.

- Frontend: Next.js 14.2 con componentes de KPIs y gráfica simple sin librería de charts.

- BD: Esquema previsto en MySQL para clientes, vendedores, ventas, pagos, comisiones y lotes (índices y triggers documentados).

## Alcance

- Crear extensión única: extensions/endpoints/dashboard/src/index.js con 6 rutas GET.

- Filtros: fecha_inicio, fecha_fin, vendedor_id, zona.

- Caché: TTL 5 minutos por combinación de filtros.

- Respuestas tipadas y estables para consumo de frontend.

## Diseño de Endpoints

### 1) GET /dashboard/kpis

- Métricas: total_ventas, total_pagado, total_pendiente, ventas_mes_actual, crecimiento_mes_anterior, lotes_vendidos_mes, comisiones_pendientes.

- Filtros: fecha_inicio/fin, vendedor_id, zona; período default: mes actual.

- Respuesta: { total_ventas, total_pagado, total_pendiente, ventas_mes_actual, crecimiento_mes_anterior, lotes_vendidos_mes, comisiones_pendientes }.

### 2) GET /dashboard/ventas-por-mes

- Agregación mensual: { mes, anio, total_ventas, monto_total, promedio_venta }.

- Período: últimos 12 meses por defecto; opción de comparar contra año anterior.

### 3) GET /dashboard/ventas-por-vendedor

- Ranking: { vendedor_id, nombre, total_ventas, monto_total, comisiones_generadas, promedio_venta }.

- Ordenamiento: monto_total DESC; período configurable.

### 4) GET /dashboard/pagos-por-estatus

- Conteos y montos por estatus: al_dia, atrasados, pendientes.

- Porcentajes de puntualidad.

### 5) GET /dashboard/lotes-por-estatus

- Distribución: { estatus, cantidad, area_total, valor_total }.

- Agrupar por zona y manzana; porcentaje de ocupación.

### 6) GET /dashboard/comisiones-por-vendedor

- Desglose: { vendedor_id, nombre, comisiones_pagadas, comisiones_pendientes, total }.

- Período configurable; por tipo: enganche, contrato, liquidación.

## Implementación Técnica

- Ubicación y patrón: crear router con registerEndpoint en Directus (mismo estilo que ventas/pagos) [ventas/index.js](file:///c:/Users/nadir/quintas-crm/extensions/endpoints/ventas/src/index.js#L262-L289), [pagos/index.js](file:///c:/Users/nadir/quintas-crm/extensions/endpoints/pagos/src/index.js#L43-L70).

- Acceso a datos: usar database/Knex del contexto o ItemsService para tablas ventas, pagos, comisiones, lotes, vendedores.

- Agregaciones SQL:
  - KPIs: SUM(monto), COUNT(\*), SUM(pagos.monto), diferencias por período y joins necesarios.

  - Ventas por mes: GROUP BY YEAR(fecha), MONTH(fecha).

  - Vendedor: GROUP BY vendedor_id con joins a vendedores y LEFT JOIN comisiones.

  - Pagos: GROUP BY estatus; reglas de atraso por fecha vencimiento.

  - Lotes: GROUP BY estatus, zona, manzana con SUM(area) y SUM(valor).

  - Comisiones: SUM por estatus/tipo y vendedor.

- Filtros: aplicar WHERE entre fechas, vendedor_id, zona; sanitizar y validar parámetros.

- Caché: in-memory Map con clave hash de ruta+query; TTL 300s; invalidar en eventos de creación/actualización de ventas/pagos vía hook existente [crm-logic](file:///c:/Users/nadir/quintas-crm/extensions/hooks/crm-logic/src/index.js).

- Paginación: no requerida para agregaciones; limitar consultas por período.

## Performance y Índices

- Usar SELECT con agregaciones sin subconsultas profundas; evitar N+1.

- Índices recomendados: ventas(fecha, vendedor_id), pagos(fecha, estatus), lotes(estatus, zona, manzana), comisiones(venta_id, vendedor_id, estatus, tipo).

- Vistas opcionales para reportes si las tablas crecen. Referencia de vistas en documentación ER.

## Contratos de Respuesta

- Especificar tipos y claves estables para frontend. Ejemplos:
  - ventas-por-mes: \[{ mes: 1, anio: 2026, total_ventas: 23, monto_total: 123456.78, promedio_venta: 5376.38 }].

  - pagos-por-estatus: \[{ estatus: "al_dia", cantidad: 180, monto_total: 251000.00 }, ...].

## Validación y Seguridad

- Validar rango de fechas (max 24 meses), vendedor_id/zona numéricos.

- Manejo de errores con mensajes claros; logs técnicos con trazas.

## Documentación

- Añadir README en la extensión con rutas, filtros, ejemplos y límites.

- Referenciar endpoints relacionados (ventas, pagos, comisiones) para contexto.

## Verificación

- Pruebas manuales con curl/HTTP y comparación contra datos existentes.

- Integración con frontend: conectar componentes de KPIs y gráfica a nuevos endpoints.

## Entregables

- Extensión dashboard con 6 rutas.

- Documentación de endpoints.

- Ejemplos de respuestas para consumo de frontend.

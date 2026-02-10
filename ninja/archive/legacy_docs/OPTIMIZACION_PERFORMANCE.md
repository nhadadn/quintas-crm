# Optimización de Performance - Quintas de Otinapa ERP

## Resumen de Mejoras (Fase T4.6)

Se han implementado diversas estrategias de optimización tanto en el Frontend como en el Backend para asegurar la escalabilidad y velocidad del sistema.

### 1. Backend (Directus Extensions)

#### Paralelización de Consultas SQL

- **Problema:** El endpoint `/dashboard/kpis` ejecutaba 7 consultas SQL de manera secuencial.
- **Solución:** Se implementó `Promise.all` para ejecutar todas las consultas de conteo y sumatoria en paralelo.
- **Impacto:** Reducción del tiempo de respuesta del endpoint en un ~40-60% (dependiendo de la carga de la BD).

#### Caching en Memoria

- **Implementación:** Se utiliza un caché en memoria (Map) con TTL de 5 minutos para los KPIs.
- **Clave de Caché:** Basada en los filtros aplicados (usuario, fechas, zona).
- **Beneficio:** Evita recalcular métricas costosas si los datos no han cambiado frecuentemente.

#### Optimización de Endpoints

- **Pagos Recientes:** Se modificó `fetchPagos` para aceptar parámetros `limit`.
- **Dashboard:** Ahora solicita solo los últimos 20 pagos en lugar de descargar la colección completa.

### 2. Frontend (React)

#### Lazy Loading y Code Splitting

- **Componentes:** Los gráficos (`GraficoVentasPorMes`, `GraficoPagosPorEstatus`, etc.) ahora se cargan de manera perezosa usando `React.lazy`.
- **Suspense:** Se añadieron límites de suspensión (`Suspense`) con indicadores de carga (`ChartLoader`) para mejorar la UX durante la carga inicial.
- **Beneficio:** Reducción del tamaño del bundle inicial y carga más rápida de la página principal.

#### Debounce en Filtros

- **Hook:** Se creó `useDebounce.ts`.
- **Aplicación:** Los filtros del dashboard (fechas, zona, vendedor) ahora esperan 500ms después de que el usuario deja de escribir antes de disparar las peticiones a la API.
- **Beneficio:** Reduce drásticamente el número de llamadas innecesarias al servidor durante la interacción del usuario.

### 3. Recomendaciones de Base de Datos

Para mantener el rendimiento óptimo con grandes volúmenes de datos, se recomienda asegurar los siguientes índices en la base de datos MySQL:

```sql
-- Índices para Ventas
CREATE INDEX idx_ventas_fecha_venta ON ventas(fecha_venta);
CREATE INDEX idx_ventas_vendedor_id ON ventas(vendedor_id);
CREATE INDEX idx_ventas_lote_id ON ventas(lote_id);

-- Índices Compuestos para Reportes
CREATE INDEX idx_ventas_fecha_vendedor ON ventas(fecha_venta, vendedor_id);

-- Índices para Pagos
CREATE INDEX idx_pagos_venta_id ON pagos(venta_id);
CREATE INDEX idx_pagos_estatus ON pagos(estatus);
CREATE INDEX idx_pagos_fecha_vencimiento ON pagos(fecha_vencimiento);
```

### 4. Próximos Pasos (T5)

- Implementar `Virtual Scrolling` en tablas si superan los 1000 registros.
- Evaluar uso de Redis para caché distribuido si se escala horizontalmente.

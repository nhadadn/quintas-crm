## Contrato de API: /api/dashboard/kpis

### Método

- GET

### Headers

- Authorization: Bearer <token> (recomendado; si falta y existe sesión, el servidor usa el accessToken de la sesión)
- X-Tenant-ID (opcional): filtra por tenant multi-tenant

### Query Params

- \_t: número (opcional, anticapado de caché)
- Otros filtros futuros: fecha_inicio, fecha_fin, etc. (sin uso actual)

### Respuesta 200

```json
{
  "data": {
    "total_ventas": number,
    "total_pagado": number,
    "total_pendiente": number,
    "ventas_mes_actual": number,
    "crecimiento_mes_anterior": number,
    "lotes_vendidos_mes": number,
    "comisiones_pendientes": number
  }
}
```

### Errores

La ruta siempre responde errores estructurados:

```json
{
  "statusCode": number,
  "message": string,
  "timestamp": string,
  "path": "/api/dashboard/kpis"
}
```

- 401: Token inválido o ausente
- 403: Falta de permisos sobre las colecciones/vistas analíticas subyacentes en Directus
- 5xx: Error de Directus o de red

### Notas

- La ruta agrega automáticamente el token de sesión si no llega el header Authorization.
- Los errores 401/403 del backend se propagan tal cual; 5xx se devuelven con `statusCode` 500 y mensaje descriptivo.
- Internamente, esta ruta consume el endpoint analítico `/crm-analytics/kpis` de Directus, reemplazando el uso previo de vistas como `v_dashboard_kpis`.
- El frontend utiliza esta ruta como **capa de BFF** para los distintos dashboards (Executive View, Ventas, Comisiones), garantizando un único contrato estable para los KPIs.

### Implementación interna

- La implementación de la ruta reside en `frontend/app/api/dashboard/kpis/route.ts`.
- La ruta delega en Directus mediante una única llamada a `/crm-analytics/kpis`, lo que reduce el número de consultas respecto a la solución anterior basada en `v_dashboard_kpis` y agregaciones múltiples.
- El mapa de campos principal es:
  - `raw.total_ventas` → `total_ventas`
  - `raw.total_pagado` / `raw.total_cobrado` → `total_pagado`
  - `raw.total_pendiente` (si está disponible) o bien `total_ventas - total_pagado` → `total_pendiente`
  - `raw.ventas_mes_actual` → `ventas_mes_actual`
  - `raw.crecimiento_mes_anterior` → `crecimiento_mes_anterior`
  - `raw.lotes_vendidos_mes` → `lotes_vendidos_mes`
  - `raw.comisiones_pendientes` → `comisiones_pendientes`

### Cliente frontend recomendado

- El cliente de frontend recomendado para consumir esta ruta es `fetchKPIs` definido en `frontend/lib/dashboard-api.ts`.
- Comportamiento de `fetchKPIs`:
  - Realiza la llamada a `/api/dashboard/kpis` con los filtros y token correspondientes.
  - En caso de errores transitorios (500, 502, 503, 504), realiza **un reintento** con backoff aleatorio.
  - En entorno navegador, muestra un `toast` de error en español si no se pueden cargar los KPIs.
  - Siempre devuelve un objeto de KPIs con valores numéricos (0 por defecto) para evitar que la UI se rompa.

### Pruebas asociadas

- **Unitarias:** `frontend/tests/unit/api-kpis-route.spec.ts`
  - Verifica el contrato de la ruta, la integración con `/crm-analytics/kpis` y la propagación de códigos de estado (401, 403, 5xx).
- **Integración:** `frontend/tests/integration/dashboard-kpis.integration.spec.tsx`
  - Comprueba el comportamiento del Dashboard de Ventas cuando la ruta devuelve errores o respuestas válidas y cómo se refleja en la UI de KPIs y gráficos.

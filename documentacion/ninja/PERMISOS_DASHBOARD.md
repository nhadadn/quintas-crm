# Permisos requeridos para Dashboard

## 1. Rol que usa el Dashboard

- El Dashboard utiliza el **mismo token de Directus** emitido en el login vía NextAuth.
- Para identificar el rol efectivo, se puede llamar a:
  - `GET /api/dashboard/kpis?diagnostic=1`
  - La respuesta incluye:
    - `user.role_id`
    - `user.role_name`

Ejemplo de salida relevante:

```json
"user": {
  "id": "<directus_user_id>",
  "email": "admin@quintas.com",
  "role_id": "<directus_role_id>",
  "role_name": "Administrator"
}
```

## 2. Colecciones necesarias

El rol que vea el Dashboard debe tener permiso **Read** (y agregados) sobre:

- `v_dashboard_kpis` (vista para KPIs globales)
- `comisiones` (cálculo de comisiones pendientes)
- `lotes` (para métricas por estatus y precio_total)

Además, la vista `v_dashboard_kpis` debe estar registrada como colección en Directus:

- Settings → Data Model → New Collection → Existing table or view → `v_dashboard_kpis`.

Si Directus requiere PK para la vista:

- Opción 1 (una sola fila): exponer `1 AS id` en la vista.
- Opción 2 (múltiples filas): exponer `ROW_NUMBER() OVER (...) AS id` como identificador estable.

## 3. Campos mínimos por colección

### 3.1 v_dashboard_kpis

El rol debe poder leer (Field Permissions → Read) los campos:

- `total_contratado`
- `total_pagado`
- `fecha_venta`
- `estatus`
- `tenant_id` (si se filtra por tenant)

### 3.2 comisiones

El rol debe poder leer:

- `monto_comision`
- `estatus`
- `tenant_id` (si aplica)

### 3.3 lotes

El rol debe poder leer al menos:

- `estatus`
- `precio_total`

Si falta permiso de lectura en `precio_total`, Directus responde 403 y en logs aparece:

- "Acceso denegado a precio_total en Lotes. Reintentando solo con estatus…"

## 4. Policies y filtros por tenant

Si el rol del Dashboard tiene policies con filtro por `tenant_id`, por ejemplo:

- `tenant_id = $CURRENT_USER.tenant_id`

entonces:

- La vista `v_dashboard_kpis` debe incluir el campo `tenant_id`.
- La colección `comisiones` debe incluir `tenant_id`.
- La colección `lotes` debe incluir `tenant_id`.

Alternativamente, para un rol de administración global del Dashboard se puede definir una policy más laxa para estas colecciones (sin filtro por tenant o con filtro compatible).

## 5. Pruebas de verificación

### 5.1 Desde Next.js (BFF)

- `GET /api/dashboard/kpis?diagnostic=1` debe devolver:
  - `results[].ok = true` para:
    - `v_dashboard_kpis_limit_1`
    - `v_dashboard_kpis_sum_total_contratado`
    - `comisiones_sum_monto_comision_pendiente`

### 5.2 Directus directo (con token real)

- `GET /items/v_dashboard_kpis?limit=1`
- `GET /items/v_dashboard_kpis?aggregate[sum]=total_contratado`
- `GET /items/lotes?fields=estatus,precio_total&limit=1`

Todas las peticiones anteriores deben responder **200** para el rol del Dashboard.

## 6. Criterio de éxito

- `/api/dashboard/kpis` responde **200** para usuario con rol autorizado.
- `GET /api/dashboard/kpis?diagnostic=1` muestra las 3 pruebas en **ok: true**.
- El Dashboard no muestra errores 403.
- No aparece el mensaje de "Acceso denegado a precio_total" en los logs.


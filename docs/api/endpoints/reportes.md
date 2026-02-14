# Endpoint de Reportes Financieros y Operativos

Este módulo proporciona una serie de endpoints para la generación de reportes detallados sobre ventas, pagos, clientes, comisiones y KPIs. Diseñado para ofrecer datos agregados y desglosados con soporte para paginación, filtros de fecha y caché optimizado.

## Ubicación Base

`/pagos/reportes`

## Autenticación

Requiere un token JWT válido (Header `Authorization: Bearer <token>`).
Los usuarios deben tener permisos de lectura sobre las colecciones `ventas`, `pagos`, `clientes` y `comisiones`.

## Parámetros Comunes

La mayoría de los endpoints de reportes aceptan los siguientes parámetros de consulta (query params):

| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|---|---|---|---|---|
| `fecha_inicio` | String (YYYY-MM-DD) | Sí | Fecha de inicio del periodo. | `2023-01-01` |
| `fecha_fin` | String (YYYY-MM-DD) | Sí | Fecha de fin del periodo. | `2023-01-31` |
| `agrupacion` | String | No | Nivel de agrupación temporal (`dia`, `semana`, `mes`). | `mes` |
| `formato` | String | No | Formato de salida (`json`, `excel`, `pdf`). Default: `json`. | `json` |
| `page` | Integer | No | Número de página para paginación. Default: `1`. | `1` |
| `limit` | Integer | No | Cantidad de registros por página. Default: `100`. | `50` |

---

## Endpoints Disponibles

### 1. Reporte de Ventas
`GET /pagos/reportes/ventas`

Obtiene un desglose de ventas filtrado por periodo, vendedor, propiedad o estatus.

**Parámetros Adicionales:**
- `vendedor_id` (UUID, opcional): Filtrar por vendedor específico.
- `propiedad_id` (UUID, opcional): Filtrar por propiedad/lote.
- `estado` (String, opcional): Filtrar por estado de la venta (ej. `activa`, `cancelada`).

**Respuesta Exitosa (JSON):**
```json
{
  "data": {
    "summary": {
      "total_ventas": 1500000,
      "cantidad_ventas": 5,
      "promedio_venta": 300000
    },
    "breakdown": [
      {
        "fecha": "2023-01-15",
        "total": 300000,
        "cantidad": 1
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 100,
      "total_records": 5
    }
  }
}
```

### 2. Reporte de Pagos
`GET /pagos/reportes/pagos`

Reporte detallado de pagos recibidos, desglosado por método de pago y estatus.

**Parámetros Adicionales:**
- `vendedor_id` (UUID, opcional).
- `metodo_pago` (String, opcional): `transferencia`, `efectivo`, `cheque`, etc.
- `estatus` (String, opcional): `pagado`, `pendiente`, `atrasado`.

**Respuesta Exitosa (JSON):**
```json
{
  "data": {
    "summary": {
      "total_pagado": 50000,
      "count": 10
    },
    "breakdown": [
      {
        "date": "2023-01-15",
        "total": 5000,
        "metodo": "transferencia"
      }
    ]
  }
}
```

### 3. Reporte de Clientes
`GET /pagos/reportes/clientes`

Estadísticas de adquisición y retención de clientes.

**Respuesta Exitosa:**
```json
{
  "data": {
    "nuevos": 12,
    "activos": 150,
    "inactivos": 5,
    "total": 155
  }
}
```

### 4. Reporte de Comisiones
`GET /pagos/reportes/comisiones`

Calcula las comisiones generadas y pendientes de pago para los vendedores.

**Parámetros Adicionales:**
- `vendedor_id` (UUID, opcional).

**Respuesta Exitosa:**
```json
{
  "data": {
    "total_pagadas": 15000,
    "total_pendientes": 5000,
    "count_pagadas": 10,
    "count_pendientes": 2,
    "breakdown": [
      {
        "estatus": "pagada",
        "total": 15000,
        "count": 10
      },
      {
        "estatus": "pendiente",
        "total": 5000,
        "count": 2
      }
    ]
  }
}
```

### 5. KPIs Generales
`GET /pagos/reportes/kpis`

Tablero de indicadores clave de rendimiento para una vista rápida del estado del negocio.

**Métricas Incluidas:**
- Volumen Total de Ventas
- Ingresos Totales (Cobrado)
- Clientes Activos
- Comisiones Pendientes
- Tasa de Conversión (si aplica)

**Respuesta Exitosa:**
```json
{
  "data": {
    "total_sales_volume": 2500000,
    "total_income": 850000,
    "active_clients": 145,
    "pending_commissions": 12500
  }
}
```

---

## Optimización y Rendimiento

### Caché
El sistema implementa un mecanismo de caché en memoria (`SimpleCache`) con una duración de **5 minutos** para las consultas de reportes. Esto reduce la carga en la base de datos para reportes frecuentemente consultados con los mismos parámetros.

### Índices de Base de Datos
Se han optimizado las tablas `ventas`, `pagos` y `clientes` con índices específicos en campos de fecha (`fecha_venta`, `fecha_pago`, `date_created`) para acelerar las consultas de rangos de fechas.

### Paginación
Para manejar grandes volúmenes de datos, los reportes de detalle (ventas, pagos, comisiones) implementan paginación en el servidor mediante SQL (`LIMIT`/`OFFSET`), asegurando tiempos de respuesta constantes independientemente del tamaño histórico de la base de datos.

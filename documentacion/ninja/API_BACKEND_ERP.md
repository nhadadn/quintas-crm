# API Backend ERP - Documentación Técnica

## Descripción General
Este documento detalla la API Backend del ERP Inmobiliario Quintas de Otinapa, implementada sobre Directus. Incluye endpoints personalizados, lógica de negocio y flujos de automatización.

## 1. Colecciones Principales
El sistema se basa en las siguientes colecciones clave:
- `clientes`: Gestión de prospectos y clientes.
- `vendedores`: Gestión de fuerza de ventas y esquemas de comisiones.
- `lotes`: Inventario de terrenos (Incluye campo `zona` para reportes).
- `ventas`: Registro de operaciones inmobiliarias.
- `pagos`: Registro de transacciones financieras.
- `comisiones`: Gestión de comisiones por venta.
- `amortizacion`: Tablas de pagos para ventas financiadas.

## 2. Endpoints Personalizados

### 2.1 Módulo de Comisiones (`/comisiones`)

#### `GET /comisiones/calcular`
Calcula la proyección de comisiones para una venta antes de generarlas.
- **Query Params**: `venta_id` (UUID)
- **Response**:
  ```json
  {
    "data": {
      "venta_id": "...",
      "comision_total": 50000,
      "detalles": {
        "monto_venta": 1000000,
        "porcentaje_aplicado": 5,
        "desglose_hitos": [
          { "concepto": "Enganche", "monto_estimado": "15000.00" },
          { "concepto": "Contrato", "monto_estimado": "15000.00" },
          { "concepto": "Liquidación", "monto_estimado": "20000.00" }
        ]
      }
    }
  }
  ```

#### `GET /comisiones/mis-comisiones`
Lista las comisiones asignadas al vendedor autenticado.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Lista de objetos `comisiones`.

#### `GET /comisiones/mis-comisiones/resumen`
Obtiene un resumen financiero del vendedor.
- **Response**:
  ```json
  {
    "data": {
      "pendiente": { "total": 15000, "cantidad": 1 },
      "aprobada": { "total": 15000, "cantidad": 1 },
      "pagada": { "total": 0, "cantidad": 0 },
      "total_acumulado": 30000
    }
  }
  ```

#### `PUT /comisiones/:id/aprobar` (Admin)
Aprueba una comisión pendiente.
- **Validaciones**: No se puede aprobar si está cancelada.

#### `PUT /comisiones/:id/pagar` (Admin)
Marca una comisión como pagada.
- **Validaciones**: Debe estar aprobada previamente.

### 2.2 Módulo de Amortización (`/amortizacion`)

#### `POST /amortizacion/generar`
Simula una tabla de amortización (método francés).
- **Body**:
  ```json
  {
    "monto_total": 1000000,
    "enganche": 100000,
    "plazo_meses": 12,
    "tasa_interes": 12,
    "fecha_inicio": "2026-03-01"
  }
  ```

### 2.3 Dashboard y Estadísticas (`/crm-analytics`)

- `GET /crm-analytics/kpis`: Totales de ventas, cobranza y clientes.
- `GET /crm-analytics/ventas-por-mes`: Histórico mensual.
- `GET /crm-analytics/ventas-por-vendedor`: Ranking de vendedores.
- `GET /crm-analytics/ventas-por-zona`: Ventas agrupadas por zona del lote.
- `GET /crm-analytics/pagos-por-estatus`: Desglose de pagos.
- `GET /crm-analytics/lotes-por-estatus`: Estado del inventario.
- `GET /crm-analytics/comisiones-por-vendedor`: Resumen de comisiones por vendedor.

#### `GET /crm-analytics/estadisticas/ventas`
Endpoint unificado de estadísticas de ventas.

- **Query Params opcionales**:
  - `desde`: Fecha inicial (YYYY-MM-DD)
  - `hasta`: Fecha final (YYYY-MM-DD)
- **Response**:

```json
{
  "data": {
    "kpis": {
      "total_ventas": 1000000,
      "total_cobrado": 800000,
      "por_cobrar": 200000,
      "clientes_activos": 42,
      "ventas_count": 18
    },
    "ventas_por_mes": [
      { "mes": "2026-01", "total": 250000 },
      { "mes": "2026-02", "total": 750000 }
    ],
    "ventas_por_vendedor": [
      { "vendedor": "Juan Pérez", "total": 600000, "cantidad": 7 },
      { "vendedor": "María López", "total": 400000, "cantidad": 5 }
    ],
    "ventas_por_zona": [
      { "zona": "Norte", "total": 700000, "cantidad": 8 },
      { "zona": "Sur", "total": 300000, "cantidad": 4 }
    ]
  }
}
```

## 3. Lógica de Negocio y Hooks

### 3.1 Creación de Venta (`venta.create`)
Al registrar una venta:
1. **Lote**: Cambia estatus a `apartado` y asigna cliente/vendedor.
2. **Amortización**: Si es financiada, genera automáticamente la tabla de pagos en la colección `amortizacion`.
3. **Comisiones**: Genera 3 registros de comisión (Enganche 30%, Contrato 30%, Liquidación 40%) en estado `pendiente`.

### 3.2 Registro de Pago (`pago.create`)
Al registrar un pago:
1. **Amortización**: Se aplica el pago a las cuotas pendientes (orden cronológico).
   - Prioridad: Penalizaciones -> Intereses -> Capital.
   - Soporta: Abonos a capital (Reducción de Cuota o Plazo) y Adelanto de Mensualidades.
2. **Liquidación**: Si el saldo llega a 0, la venta pasa a estatus `pagada` y el lote a `vendido`.

### 3.3 Automatización de Comisiones
Las comisiones se generan automáticamente pero requieren aprobación manual del administrador para asegurar cumplimiento de hitos (ej. verificar que el enganche real se pagó antes de aprobar la comisión de enganche).

## 4. Guía de Testing

### Pruebas de Comisiones
1. Crear una venta con un vendedor asignado (comisión 5%).
2. Verificar que se creen 3 registros en `comisiones`.
3. Loguearse como el vendedor y verificar `/comisiones/mis-comisiones`.
4. Loguearse como admin y aprobar una comisión.

### Pruebas de Amortización
1. Crear venta financiada (12 meses).
2. Verificar creación de 12 registros en `amortizacion`.
3. Registrar un pago parcial de la primera cuota.
4. Verificar que el estatus de la cuota cambie a `parcial`.
5. Completar el pago y verificar estatus `pagado`.

## 5. Troubleshooting / Errores Comunes

- **Error**: "La venta no tiene vendedor asignado" al calcular comisiones.
  - **Solución**: Asegurar que el campo `vendedor_id` en la venta no sea null.
- **Error**: "El lote no está disponible".
  - **Solución**: Verificar que el lote tenga estatus `disponible` antes de crear la venta.
- **Cálculo incorrecto de intereses**:
  - Verificar que la `tasa_interes` sea anual (ej. 12.0 para 12%). El sistema divide entre 100 y entre 12 internamente.

---
*Generado por Quintas de Otinapa Backend Agent - Fase 7*

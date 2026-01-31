# API Backend - ERP Inmobiliario

## Autenticación
- **JWT Tokens:** Todos los endpoints requieren un token Bearer en el header `Authorization`.
- **Refresh Tokens:** Manejados nativamente por el endpoint `/auth/refresh` de Directus.
- **Permisos por Rol:**
  - `Administrador`: Acceso total.
  - `Vendedor`: Acceso de lectura/escritura a sus propias ventas y clientes asignados.
  - `Finanzas`: Acceso a reportes y validación de pagos.

## Endpoints

### /clientes

- **GET /clientes** - Listar clientes
- **GET /clientes/:id** - Obtener cliente por ID
- **POST /clientes** - Crear cliente
- **PATCH /clientes/:id** - Actualizar cliente
- **DELETE /clientes/:id** - Eliminar cliente (Soft Delete)

**Request/Response examples:**

**POST /clientes**
```json
// Request
{
  "nombre": "Juan",
  "apellido_paterno": "Pérez",
  "email": "juan.perez@example.com",
  "rfc": "PEPJ800101XYZ",
  "telefono": "5551234567"
}

// Response (200 OK)
{
  "data": {
    "id": "a1b2c3d4-...",
    "nombre": "Juan",
    "estatus": "prospecto",
    "fecha_registro": "2024-01-30T10:00:00Z"
  }
}
```

**Error codes:**

-   **400 Bad Request:** Datos inválidos o faltantes.
-   **401 Unauthorized:** Token no proporcionado o inválido.
-   **403 Forbidden:** No tiene permisos para esta acción.
-   **404 Not Found:** Recurso no encontrado.
-   **409 Conflict:** Email o RFC ya registrado.
-   **429 Too Many Requests:** Excedido límite de 100 req/min.
-   **500 Internal Server Error:** Error inesperado en servidor.

### /vendedores

- **GET /vendedores** - Listar vendedores
- **POST /vendedores** - Registrar vendedor
- **GET /vendedores/:id** - Detalle y métricas

**Request/Response examples:**

```json
// GET /vendedores?activo=true
{
  "data": [
    {
      "id": "v1...",
      "nombre": "Ana López",
      "comision_porcentaje": 0.05
    }
  ]
}
```

### /ventas

- **GET /ventas** - Listar ventas (filtros: estatus, fechas)
- **POST /ventas** - Crear venta (Inicia proceso de amortización)
- **GET /ventas/:id** - Detalle completo (incluye pagos y comisiones)

**Request/Response examples:**

**POST /ventas**
```json
// Request
{
  "lote_id": "lote-uuid",
  "cliente_id": "cliente-uuid",
  "vendedor_id": "vendedor-uuid",
  "monto_total": 500000,
  "enganche": 50000,
  "plazo_meses": 12
}

// Response
{
  "data": {
    "id": "venta-uuid",
    "monto_financiado": 450000,
    "tabla_amortizacion_generada": true
  }
}
```

### /comisiones

- **GET /comisiones/calcular** - Calcular y desglosar comisiones
- **GET /comisiones** - Listar historial de comisiones

**Request/Response examples:**

**GET /comisiones/calcular?venta_id=...**
```json
// Response
{
  "data": {
    "venta_id": "venta-uuid",
    "vendedor": { "id": "...", "esquema": "mixto" },
    "calculo": {
      "monto_venta": 100000,
      "base_calculo": { "porcentaje": 2, "fijo": 1000 },
      "comision_total": 3000
    },
    "desglose": [
      { "tipo": "enganche", "monto": 900, "porcentaje_split": 30 },
      { "tipo": "contrato", "monto": 900, "porcentaje_split": 30 },
      { "tipo": "liquidacion", "monto": 1200, "porcentaje_split": 40 }
    ]
  }
}
```

### /amortizacion

- **GET /amortizacion/generar** - Generar o simular tabla de amortización

**Request/Response examples:**

**GET /amortizacion/generar?venta_id=...**
(Genera tabla basada en venta existente con estatus 'contrato')

**GET /amortizacion/generar?monto_total=100000&plazo_meses=24&metodo=aleman**
(Simulación con parámetros manuales)
```json
// Response
{
  "data": [
    {
      "numero_pago": 1,
      "monto": 5000,
      "capital": 4166.67,
      "interes": 833.33,
      "saldo": 95833.33
    },
    // ...
  ]
}
```

### /pagos

- **GET /pagos** - Listar historial de pagos
- **POST /pagos** - Registrar pago (Calcula mora y actualiza saldos)

**Request/Response examples:**

**POST /pagos**
```json
// Request
{
  "venta_id": "venta-uuid",
  "monto": 5000,
  "metodo_pago": "transferencia"
}

// Response
{
  "data": {
    "id": "pago-uuid",
    "estatus": "pagado",
    "mora_aplicada": 0,
    "saldo_restante_venta": 445000
  }
}
```

## Lógica de Negocio

-   **Cálculo de Comisiones:**
    - Esquemas soportados: `fijo`, `porcentaje`, `mixto`.
    - Desglose automático de pagos: 30% al Enganche, 30% al Contrato, 40% a la Liquidación.
    - Se calculan via `/comisiones/calcular`.
-   **Generación de Tabla de Amortización:**
    - Métodos: Francés (cuota fija) y Alemán (capital constante).
    - Generador unificado en `/amortizacion/generar`.
-   **Actualización Automática de Estatus:**
    -   Venta pasa a `liquidado` cuando saldo llega a 0.
    -   Pagos pasan a `atrasado` si `fecha_actual > fecha_vencimiento`.

## Troubleshooting

-   **Error 409 en Clientes:** Verificar que el Email o RFC no exista previamente en la base de datos (incluso en registros inactivos si la regla lo dicta).
-   **Lote no disponible:** Al intentar vender, si recibe error de disponibilidad, verificar estatus del lote en `/mapa-lotes`.
-   **Mora no calculada:** La mora solo se calcula si el pago se registra *después* de la fecha de vencimiento configurada en la mensualidad.
-   **Debugging Tips:**
    -   Revisar logs de Directus (`docker logs directus`) para stack traces detallados.
    -   Usar `npm test` para validar lógica de endpoints aislada.

# API Backend ERP - Quintas de Otinapa

Este documento detalla los endpoints, lógica de negocio y flujos del backend del ERP Inmobiliario.

## 1. Endpoints Personalizados

### 1.1 Clientes (`/clientes`)
- **GET /**: Listar clientes (filtros: search, estatus).
- **GET /:id**: Obtener detalle de cliente con ventas relacionadas.
- **POST /**: Crear cliente (validación de email/RFC únicos).
- **PATCH /:id**: Actualizar cliente.
- **DELETE /:id**: Soft delete (estatus -> inactivo).

### 1.2 Vendedores (`/vendedores`)
- **GET /**: Listar vendedores (filtros: activo, search).
- **GET /:id**: Detalle con ventas históricas.
- **POST /**: Registrar vendedor.
- **PATCH /:id**: Modificar datos/comisión.
- **DELETE /:id**: Desactivar vendedor (estatus -> 0).

### 1.3 Ventas (`/ventas`)
- **POST /**: Crear nueva venta.
  - **Body**: `{ cliente_id, lote_id, monto_enganche, plazo_meses, tasa_interes }`
  - **Lógica**: Valida disponibilidad de lote, crea venta, actualiza lote a 'apartado', genera proyección de amortización.
- **GET /**: Listar ventas (filtros: fecha, vendedor, cliente).
  - **Seguridad**: RLS (Row Level Security) para vendedores (solo ven sus ventas).

### 1.4 Pagos (`/pagos`)
- **POST /**: Registrar pago manual.
  - **Body**: `{ venta_id, monto, ... }`
  - **Lógica**: Aplica al pago pendiente más antiguo, calcula mora si aplica.
- **POST /create-payment-intent**: Iniciar pago con Stripe.
- **POST /webhook**: Recepción de confirmación de Stripe.

### 1.5 Comisiones (`/comisiones`)
- **GET /calcular**: Calcular comisión proyectada para una venta.
  - **Query**: `venta_id`
  - **Response**: Desglose por esquema (fijo/porcentaje).

### 1.6 Amortización (`/amortizacion`)
- **POST /generar**: Generar tabla de amortización simulada.
  - **Body**: `{ monto_total, enganche, plazo_meses, tasa_interes, fecha_inicio }`
  - **Response**: Tabla detallada con fechas y montos.

### 1.7 Analítica (`/crm-analytics`)
- **GET /ventas-por-mes**: Histórico de ventas.
- **GET /ventas-por-vendedor**: Performance de vendedores.
- **GET /lotes-por-estatus**: Disponibilidad de inventario.
- **GET /pagos-por-estatus**: Flujo de caja (pagado vs pendiente).

## 2. Lógica de Negocio (Hooks)

### 2.1 Creación de Venta (`venta.create`)
1. **Validación**: Verifica que el lote esté `disponible`.
2. **Acción**:
   - Cambia estatus de lote a `apartado`.
   - Genera tabla de amortización en colección `pagos`.
   - Calcula y registra comisiones en colección `comisiones`.

### 2.2 Registro de Pago (`pago.create`)
1. **Cálculo de Mora**: Si `fecha_pago > fecha_vencimiento`, aplica 5% de mora.
2. **Liquidación**: Si se cubren todos los pagos, actualiza `venta.estatus` a `pagada` y `lote.estatus` a `vendido`.

## 3. Seguridad y Permisos
- **Roles**:
  - `Cliente`: Acceso solo a sus ventas/pagos.
  - `Vendedor`: Acceso a sus ventas y clientes asignados.
  - `Admin`: Acceso total.
- **Rate Limiting**: 100 req/min por IP.
- **OAuth**: Scopes requeridos (`write:ventas`, `read:ventas:own`).

## 4. Troubleshooting
- **Error 401 en Analítica**: Verificar que el rol tenga permisos de lectura en `lotes`, `pagos`, `ventas`. El endpoint intenta auto-corregir esto al inicio.
- **Stripe Webhook Error**: Verificar `STRIPE_WEBHOOK_SECRET` en variables de entorno.
  
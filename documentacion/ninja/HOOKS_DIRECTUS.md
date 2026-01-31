# Documentación de Hooks (Triggers) - CRM Quintas de Otinapa

Esta extensión implementa la lógica de negocio crítica del ERP inmobiliario mediante Directus Hooks.

## 📂 Ubicación
`extensions/hooks/crm-logic/src/index.js`

## 🪝 Triggers Implementados

### 1. Validación de Disponibilidad (`lote.create` / `venta.create`)
**Evento:** `filter('ventas.items.create')` y `filter('lotes.items.create')`
- **Lógica:**
  - Al crear un lote nuevo, asegura que nazca con estatus `disponible` por defecto.
  - Al crear una venta, verifica que el `lote_id` seleccionado exista y tenga estatus `disponible`.
  - Si el lote no está disponible, bloquea la creación de la venta con un error `403 Forbidden`.

### 2. Actualización Automática de Lote
**Evento:** `action('ventas.items.create')`
- **Lógica:**
  - Una vez creada la venta exitosamente, actualiza el registro del lote asociado:
    - `estatus`: Cambia a `apartado`.
    - `cliente_id`: Asigna el cliente de la venta.
    - `vendedor_id`: Asigna el vendedor de la venta.

### 3. Generación de Tabla de Amortización
**Evento:** `action('ventas.items.create')`
- **Condición:** Solo si `tipo_venta === 'financiado'`.
- **Lógica:**
  - Calcula la cuota mensual usando la fórmula de anualidades vencidas (francés).
  - Genera registros en la colección `pagos` correspondientes al `plazo_meses`.
  - Cada pago incluye: capital, interés, saldo restante y fecha programada.

### 4. Cálculo de Comisiones
**Evento:** `action('ventas.items.create')`
- **Lógica:**
  - Obtiene el porcentaje de comisión del vendedor (default: 5%).
  - Calcula el monto total de comisión sobre el valor de la venta.
  - Genera 3 registros en la colección `comisiones`:
    1. **Enganche (30%)**: Exigible al pagar el enganche.
    2. **Contrato (30%)**: Exigible al firmar contrato.
    3. **Liquidación (40%)**: Exigible al liquidar la venta.

### 5. Cálculo de Mora
**Evento:** `action('pagos.items.create')`
- **Lógica:**
  - Al registrar un pago, compara la fecha de registro con la `fecha_programada`.
  - Si hay retraso (> 0 días), calcula una mora del 5% sobre el monto del pago.
  - Actualiza el registro del pago con el monto de mora y una nota automática.

### 6. Liquidación Automática
**Evento:** `action('pagos.items.create')`
- **Lógica:**
  - Verifica si todos los pagos de la venta asociada están marcados como `pagado`.
  - Suma el total pagado y compara con el `monto_total` de la venta.
  - Si se ha cubierto la deuda, cambia el estatus de la **Venta** a `pagada` y del **Lote** a `vendido`.

## ⚙️ Instalación y Despliegue

La extensión ya se encuentra en la carpeta `extensions/hooks/crm-logic`.
Directus detectará automáticamente el archivo `package.json` y cargará el punto de entrada `src/index.js`.

**Requisitos:**
- Reiniciar Directus para aplicar cambios:
  ```bash
  npm start
  ```

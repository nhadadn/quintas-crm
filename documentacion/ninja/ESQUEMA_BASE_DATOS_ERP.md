# Esquema de Base de Datos - ERP Inmobiliario

## Diagramas ERD

### Diagrama Completo (Mermaid)

```mermaid
erDiagram
    CLIENTES ||--o{ VENTAS : realiza
    VENDEDORES ||--o{ VENTAS : gestiona
    VENDEDORES ||--o{ COMISIONES : recibe
    LOTES ||--o{ VENTAS : es_vendido_en
    VENTAS ||--o{ PAGOS : genera
    VENTAS ||--o{ COMISIONES : genera

    CLIENTES {
        uuid id PK
        string nombre
        string apellido_paterno
        string apellido_materno
        string email UK
        string telefono
        string rfc UK
        string estatus "prospecto, activo, inactivo"
        datetime fecha_registro
    }

    VENDEDORES {
        uuid id PK
        string nombre
        string apellido_paterno
        string email UK
        decimal comision_porcentaje
        string comision_esquema "fijo, porcentaje, mixto"
        boolean estatus
    }

    VENTAS {
        uuid id PK
        uuid lote_id FK
        uuid cliente_id FK
        uuid vendedor_id FK
        date fecha_venta
        decimal monto_total
        decimal enganche
        decimal monto_financiado
        string estatus "apartado, contrato, pagos, liquidado"
        string metodo_pago
    }

    PAGOS {
        uuid id PK
        uuid venta_id FK
        int numero_pago
        date fecha_vencimiento
        date fecha_pago
        decimal monto
        decimal monto_pagado
        decimal mora
        string estatus "pendiente, pagado, atrasado"
    }

    COMISIONES {
        uuid id PK
        uuid venta_id FK
        uuid vendedor_id FK
        decimal monto_comision
        decimal porcentaje
        string tipo_comision "enganche, contrato, mensualidad"
        string estatus "pendiente, pagada"
        date fecha_pago_programada
    }
```

## Colecciones

### clientes
Almacena la información de prospectos y clientes reales.

- **Campos:**
  - `id` (UUID, PK): Identificador único.
  - `nombre` (String, required): Nombre(s) del cliente.
  - `apellido_paterno` (String, required): Apellido paterno.
  - `apellido_materno` (String): Apellido materno.
  - `email` (String, Unique, required): Correo electrónico.
  - `rfc` (String, Unique, required): RFC para facturación.
  - `estatus` (String, Enum): `prospecto`, `activo`, `inactivo`. Default: `prospecto`.
- **Índices:**
  - `email_unique`: `[email]`
  - `rfc_unique`: `[rfc]`
- **Relaciones:**
  - `ventas`: One-to-Many con la colección `ventas`.
- **Validaciones:**
  - Email válido.
  - RFC con formato correcto.

### vendedores
Personal de ventas y comisionistas externos.

- **Campos:**
  - `id` (UUID, PK): Identificador único.
  - `nombre` (String, required): Nombre completo.
  - `email` (String, Unique, required): Correo de contacto.
  - `comision_porcentaje` (Decimal): Porcentaje base de comisión.
  - `estatus` (Boolean): `true` (Activo), `false` (Inactivo).
- **Índices:**
  - `email_unique`: `[email]`
- **Relaciones:**
  - `ventas`: One-to-Many.
  - `comisiones`: One-to-Many.

### ventas
Tabla pivote central que vincula operaciones.

- **Campos:**
  - `id` (UUID, PK): Identificador único.
  - `lote_id` (UUID, FK): Referencia al lote (inventario).
  - `cliente_id` (UUID, FK): Referencia al cliente.
  - `vendedor_id` (UUID, FK): Referencia al vendedor.
  - `monto_total` (Decimal): Valor total de la operación.
  - `enganche` (Decimal): Monto inicial.
  - `monto_financiado` (Decimal): `monto_total - enganche`.
  - `plazo_meses` (Int): Número de mensualidades.
  - `estatus` (String, Enum): `apartado`, `contrato`, `pagos`, `liquidado`, `cancelada`.
- **Relaciones:**
  - `lote`: Many-to-One.
  - `cliente`: Many-to-One.
  - `vendedor`: Many-to-One.
  - `pagos`: One-to-Many (Cascade Delete).

### pagos
Tabla de amortización y registro de ingresos.

- **Campos:**
  - `id` (UUID, PK): Identificador único.
  - `venta_id` (UUID, FK): Referencia a la venta.
  - `numero_pago` (Int): Número consecutivo de la mensualidad.
  - `fecha_vencimiento` (Date): Fecha límite de pago.
  - `monto` (Decimal): Monto programado.
  - `monto_pagado` (Decimal): Monto real pagado.
  - `mora` (Decimal): Monto por penalización.
  - `estatus` (String, Enum): `pendiente`, `pagado`, `atrasado`.
- **Relaciones:**
  - `venta`: Many-to-One.

### comisiones
Registro de pasivos de la empresa hacia los vendedores.

- **Campos:**
  - `id` (UUID, PK): Identificador único.
  - `venta_id` (UUID, FK).
  - `vendedor_id` (UUID, FK).
  - `monto_comision` (Decimal).
  - `estatus` (String, Enum): `pendiente`, `pagada`.

## Triggers

En esta arquitectura basada en Directus, los "triggers" se implementan principalmente como Hooks de Lógica de Negocio (Directus Actions) o dentro de los Custom Endpoints.

1.  **Creación de Tabla de Amortización:**
    -   **Disparador:** `POST /ventas` (Creación exitosa de venta).
    -   **Acción:** Genera N registros en la colección `pagos` calculando fechas y montos.
    -   **Ubicación:** `extensions/endpoints/ventas/src/index.js`.

2.  **Actualización de Estatus de Venta (Liquidación):**
    -   **Disparador:** `POST /pagos` (Pago registrado).
    -   **Acción:** Verifica si `SUM(monto_pagado) >= monto_total`. Si es así, actualiza `venta.estatus` a `liquidado`.
    -   **Ubicación:** `extensions/endpoints/pagos/src/index.js`.

3.  **Cálculo Automático de Mora:**
    -   **Disparador:** `POST /pagos` (Al intentar pagar).
    -   **Acción:** Si `fecha_actual > fecha_vencimiento`, aplica 5% de mora sobre el monto de la mensualidad.
    -   **Ubicación:** `extensions/endpoints/pagos/src/index.js`.

## Migraciones

Las migraciones se gestionan mediante scripts SQL y la sincronización de esquema de Directus.

### Script Inicial (Ejemplo)
`database/migrations/001_create_crm_schema.sql`

```sql
CREATE TABLE clientes (
    id CHAR(36) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    -- ...
);
-- (Scripts completos disponibles en repositorio de migraciones)
```

### Datos de Prueba (Seeds)
Se recomienda usar el endpoint `/utils/seed` (si está habilitado en desarrollo) para poblar datos iniciales de catálogos.

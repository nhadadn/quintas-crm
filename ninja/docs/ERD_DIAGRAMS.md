# Diseño de Base de Datos - Módulo CRM y Ventas (Fase 2)

**Versión:** 1.0.0
**Fecha:** 30 Enero 2026
**Responsable:** Database Agent Warrior

## 1. Diagrama Entidad-Relación (ERD)

```mermaid
erDiagram
    CLIENTES ||--o{ VENTAS : realiza
    VENDEDORES ||--o{ VENTAS : gestiona
    VENDEDORES ||--o{ COMISIONES : recibe
    LOTES ||--o{ VENTAS : es_vendido_en
    VENTAS ||--o{ PAGOS : genera
    VENTAS ||--o{ COMISIONES : genera
    VENTAS ||--o{ SUSCRIPCIONES : tiene
    SUSCRIPCIONES ||--o{ AMORTIZACIONES : genera
    PLANES_PAGOS ||--o{ SUSCRIPCIONES : define

    OAUTH_CLIENTS ||--o{ OAUTH_AUTHORIZATION_CODES : genera
    OAUTH_CLIENTS ||--o{ OAUTH_ACCESS_TOKENS : posee
    OAUTH_CLIENTS ||--o{ OAUTH_REFRESH_TOKENS : posee

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
        string stripe_customer_id "nullable"
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
        string stripe_payment_intent_id "UK, nullable"
        string stripe_customer_id "nullable"
        string stripe_last4 "nullable"
        json metodo_pago_detalle "nullable"
    }

    SUSCRIPCIONES {
        uuid id PK
        uuid cliente_id FK
        uuid venta_id FK
        uuid plan_id FK
        string stripe_subscription_id UK
        string estado "active, past_due, canceled"
        date fecha_inicio
        date fecha_fin
    }

    AMORTIZACIONES {
        uuid id PK
        uuid suscripcion_id FK
        int numero_pago
        date fecha_vencimiento
        decimal monto_capital
        decimal monto_interes
        decimal monto_total
        string estatus "pendiente, pagado, vencido"
        uuid pago_id FK
    }

    PLANES_PAGOS {
        uuid id PK
        string nombre
        string descripcion "nullable"
        decimal monto_inicial
    }

    OAUTH_CLIENTS {
        uuid id PK
        string client_id UK
        string client_secret
        string name
        json redirect_uris
        json scopes
        boolean is_active
        int rate_limit_per_hour
        uuid created_by FK
    }

    OAUTH_AUTHORIZATION_CODES {
        uuid id PK
        string code UK
        uuid client_id FK
        uuid user_id FK
        string redirect_uri
        json scopes
        timestamp expires_at
    }

    OAUTH_ACCESS_TOKENS {
        uuid id PK
        string access_token UK
        uuid client_id FK
        uuid user_id FK
        json scopes
        timestamp expires_at
    }

    OAUTH_REFRESH_TOKENS {
        uuid id PK
        string refresh_token UK
        uuid client_id FK
        uuid user_id FK
        json scopes
        timestamp expires_at
        boolean revoked
    }
```

## 2. Descripción de Tablas

### Módulo Clientes

- **clientes**: Almacena la información personal y de contacto de los clientes potenciales y reales. Se vincula con Stripe Customer.

### Módulo Ventas

- **ventas**: Registro central de la operación de venta. Vincula un lote con un cliente y un vendedor.
- **lotes**: (Referencia) Inventario de terrenos disponibles.
- **vendedores**: Agentes encargados de la venta.

### Módulo Financiero

- **pagos**: Registro individual de cada pago realizado o programado.
- **planes_pagos**: Definición de esquemas de financiamiento.
- **suscripciones**: Manejo de pagos recurrentes vía Stripe.
- **amortizaciones**: Desglose de pagos de capital e intereses.

### Módulo Seguridad (OAuth 2.0)

- **oauth_clients**: Aplicaciones de terceros registradas para acceder a la API.
- **oauth_authorization_codes**: Códigos temporales para el flujo de autorización.
- **oauth_access_tokens**: Tokens de acceso (JWT) para autenticar peticiones.
- **oauth_refresh_tokens**: Tokens de larga duración para renovar el acceso.

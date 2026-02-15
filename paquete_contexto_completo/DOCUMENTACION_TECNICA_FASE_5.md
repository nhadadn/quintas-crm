# Documentación Técnica Integral - Quintas CRM (Fase 5)

**Fecha de Actualización:** 05 de Febrero de 2026  
**Versión:** 1.0.0  
**Estatus:** En Desarrollo / Validación  

---

## 1. Resumen Ejecutivo

El presente documento detalla el estado técnico actual del ecosistema **Quintas CRM**, enfocándose en las recientes implementaciones de la **Fase 5**. Esta fase ha introducido capacidades críticas de negocio, incluyendo un motor de ventas con cálculo de amortizaciones, integración de pagos con Stripe, un sistema de análisis de datos (Analytics) y una arquitectura orientada a eventos mediante Webhooks.

El sistema ha evolucionado de un CMS headless básico a una plataforma CRM robusta con lógica de negocio personalizada encapsulada en extensiones de Directus y un frontend moderno en Next.js.

---

## 2. Arquitectura del Sistema

### 2.1 Visión General
La arquitectura sigue un patrón **Monolito Modular sobre Headless CMS**. Directus actúa como el núcleo de gestión de datos y autenticación, mientras que la lógica de negocio compleja se implementa a través de extensiones personalizadas (Endpoints y Hooks). El Frontend consume estas APIs para ofrecer experiencias de usuario a medida.

### 2.2 Tech Stack
*   **Frontend**: Next.js 14 (App Router), Tailwind CSS, Shadcn UI, NextAuth.js.
*   **Backend**: Directus CMS (Node.js).
*   **Base de Datos**: PostgreSQL (Neon Tech) / MySQL (Compatibilidad Legacy en migraciones).
*   **Integraciones**: Stripe (Pagos), Webhooks System (Eventos).
*   **Infraestructura**: Docker / Docker Compose.

### 2.3 Diagrama de Componentes (Alto Nivel)

```mermaid
graph TD
    User[Usuario Final] -->|HTTPS| FE[Frontend Next.js]
    Dev[Desarrollador 3ro] -->|API Key| API[Directus API]
    
    subgraph "Directus Core & Extensions"
        API --> Auth[Auth & Permissions]
        Auth --> ExtVentas[Extensión: Ventas API]
        Auth --> ExtPagos[Extensión: Pagos (Stripe)]
        Auth --> ExtAnalytics[Extensión: CRM Analytics]
        
        ExtVentas --> Hooks[Logic Hooks]
        ExtPagos --> Hooks
        
        Hooks --> WebhookTrigger[Extension: Webhook Trigger]
    end
    
    subgraph "Data Layer"
        ExtVentas --> DB[(Base de Datos)]
        ExtPagos --> DB
        ExtAnalytics --> DB
    end
    
    WebhookTrigger -->|POST| ExternalSys[Sistemas Externos]
    ExtPagos -->|API| Stripe[Stripe Gateway]
```

---

## 3. Especificaciones de Componentes

### 3.1 Backend Extensions (Directus)

#### A. Ventas API (`extensions/ventas-api`)
Motor central de procesamiento de ventas inmobiliarias.
*   **Responsabilidades**:
    *   Creación de ventas con validación de disponibilidad de lotes.
    *   Cálculo financiero (Enganche, Plazo, Tasa de Interés).
    *   Generación automática de tabla de amortización (proyección de pagos).
    *   Cálculo y asignación de comisiones a vendedores.
    *   Seguridad RLS (Row Level Security) para vendedores.
*   **Dependencias**: `lotes`, `clientes`, `vendedores`, `comisiones`.

#### B. Pagos & Stripe (`extensions/pagos`)
Gestor de transacciones financieras.
*   **Responsabilidades**:
    *   Registro de pagos manuales (Efectivo, Transferencia).
    *   Creación de `PaymentIntents` en Stripe.
    *   Manejo de Webhooks de Stripe para conciliación automática.
    *   Cálculo de morosidad (5% sobre monto vencido).
    *   Liquidación automática de ventas al completar saldo.
*   **Rate Limiting**: Implementado en memoria (100 req/min global, 5 req/min para intentos de pago).

#### C. Webhooks System (`extensions/webhooks-trigger` & `webhooks-subscriptions`)
Sistema de distribución de eventos para integraciones.
*   **Mecanismo**: Cola de procesamiento asíncrona (Cron cada 30s).
*   **Características**:
    *   Reintentos exponenciales (Backoff: 1s, 5s, 30s).
    *   Firma de seguridad HMAC SHA256 (`X-Webhook-Signature`).
    *   Circuit Breaker: Desactivación tras 10 fallos consecutivos.
*   **Eventos Soportados**: `venta.created`, `venta.liquidado`, `pago.completed`.

#### D. CRM Analytics (`extensions/directus-endpoint-crm-analytics`)
Agregador de datos para dashboards.
*   **Funciones**:
    *   Agrupación de ventas por mes y vendedor.
    *   Análisis de estatus de lotes y cartera vencida.
*   **Seguridad**: Validaciones de permisos automáticas al inicio (Auto-fix permissions).

### 3.2 Frontend (`frontend/app`)
*   **Dashboard**: Visualización de KPIs consumiendo `crm-analytics`.
*   **Developer Portal**: Gestión de Apps OAuth y Webhooks para integradores.
*   **Módulos Operativos**: Vistas especializadas para Ventas, Pagos y Mapa Interactivo.

---

## 4. Interfaces y APIs

### 4.1 Endpoints Principales

| Método | Endpoint | Descripción | Scopes Requeridos |
| :--- | :--- | :--- | :--- |
| **POST** | `/ventas` | Crear venta, generar amortización y comisiones | `write:ventas` |
| **GET** | `/ventas` | Listar ventas (filtro por usuario si es vendedor) | `read:ventas`, `read:ventas:own` |
| **POST** | `/pagos` | Registrar pago manual | `write:pagos` |
| **POST** | `/pagos/create-payment-intent` | Iniciar flujo de pago con Stripe | `write:pagos` |
| **GET** | `/crm-analytics/ventas-por-mes` | Métricas de ventas mensuales | `read:analytics` |

### 4.2 Modelo de Datos (Esquema Simplificado)

*   **Lotes**: `id`, `precio_lista`, `estatus` (disponible, apartado, vendido), `dimensiones`.
*   **Ventas**: `id`, `cliente_id`, `lote_id`, `vendedor_id`, `monto_total`, `enganche`, `plazo_meses`, `tasa_interes`, `estatus`.
*   **Pagos**: `id`, `venta_id`, `numero_pago`, `monto`, `mora`, `estatus` (pendiente, pagado, atrasado), `stripe_payment_intent_id`.
*   **Comisiones**: `id`, `venta_id`, `vendedor_id`, `monto`, `estatus`.
*   **Webhooks_Subscriptions**: `id`, `event_type`, `url`, `secret`, `client_id`.

---

## 5. Análisis de Riesgos Técnicos

### 5.1 Críticos 🔴
1.  **Discrepancia de Motor de Base de Datos**:
    *   Las reglas del proyecto indican **PostgreSQL (Neon)**.
    *   Los scripts de migración recientes (ej. `010_create_webhooks_schema.sql`) usan sintaxis específica de **MySQL** (`ENGINE=InnoDB`, `SET FOREIGN_KEY_CHECKS`).
    *   **Riesgo**: Fallo total al desplegar migraciones en ambiente de producción PostgreSQL.
    *   **Mitigación**: Refactorizar scripts SQL para ser agnósticos o específicos para Postgres.

2.  **Manejo de Estado en Memoria**:
    *   Los Rate Limiters y Cachés en las extensiones usan `Map()` en memoria.
    *   **Riesgo**: Pérdida de contadores y caché al reiniciar el contenedor/servicio. En entornos escalados horizontalmente, el rate limit no será efectivo globalmente.
    *   **Mitigación**: Implementar Redis para gestión de estado efímero.

### 5.2 Moderados 🟠
1.  **Lógica de "Auto-Fix Permissions"**:
    *   La extensión `crm-analytics` intenta corregir permisos al inicio.
    *   **Riesgo**: Podría sobrescribir configuraciones de seguridad manuales en producción o causar condiciones de carrera durante el arranque.

2.  **Seguridad de Webhooks**:
    *   Actualmente se valida la firma HMAC, pero no hay mecanismos de "Replay Attack Prevention" (ej. timestamp en headers).

---

## 6. Estimación de Esfuerzo y Próximos Pasos

Para consolidar la Fase 5 y preparar la Fase 6, se requiere el siguiente plan de trabajo:

### Hitos Inmediatos (Semana 1-2)
1.  **Normalización de Base de Datos** (Esfuerzo: Medio)
    *   Auditar y convertir todas las migraciones SQL a sintaxis PostgreSQL.
    *   Verificar compatibilidad de tipos de datos (`JSON` vs `JSONB`, `TINYINT` vs `BOOLEAN`).
2.  **Cobertura de Pruebas** (Esfuerzo: Alto)
    *   Crear tests unitarios para lógica de amortización (`ventas-api`).
    *   Tests de integración para flujo de Stripe (`pagos`).

### Planificación Fase 6: Optimización y Escala
*   **Objetivo**: Preparar el sistema para alta concurrencia y múltiples tenants.
*   **Entregables**:
    *   Implementación de Redis para Caché y Rate Limiting.
    *   Refactorización de "Auto-Fix Permissions" a un script de migración controlado.
    *   Dashboard de Operaciones avanzado (Reportes PDF exportables).

### Recursos Necesarios
*   1 Backend Developer (Directus/Node.js/SQL).
*   1 Frontend Developer (Next.js/React).
*   Acceso a ambiente Staging con réplica exacta de producción (PostgreSQL) para validación de migraciones.

---
*Generado por Agente de Documentación Técnica - Quintas CRM*

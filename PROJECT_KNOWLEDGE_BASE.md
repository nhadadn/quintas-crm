# 🏔️ QUINTAS-CRM — PROJECT KNOWLEDGE BASE
### Base de Conocimientos Completa | Optimizada para NotebookLM
**Versión:** 2.0 | **Fecha:** 2026 | **Clasificación:** Confidencial — Uso Interno

---

> **INSTRUCCIÓN PARA NOTEBOOKLM:** Este documento es la fuente de verdad única del sistema Quintas-CRM. Contiene arquitectura técnica, lógica de negocio PropTech, modelo de datos completo, reglas de validación, integraciones y estrategia de ventas. Úsalo para generar podcasts de entrenamiento, guías de onboarding y materiales de capacitación para equipos de ventas y desarrollo.

---

## ÍNDICE DE CONTENIDOS

1. [Visión General del Producto](#1-vision-general)
2. [Arquitectura del Sistema](#2-arquitectura)
3. [Stack Tecnológico Detallado](#3-stack)
4. [Lógica de Negocio PropTech](#4-logica-negocio)
5. [Ciclo de Vida del Lead](#5-ciclo-lead)
6. [Modelo de Datos Completo](#6-modelo-datos)
7. [Reglas de Validación y Negocio](#7-reglas)
8. [Integraciones Críticas](#8-integraciones)
9. [API Endpoints Documentados](#9-api)
10. [Seguridad y Autenticación](#10-seguridad)
11. [Roles y Permisos](#11-roles)
12. [KPIs y Métricas del Sistema](#12-kpis)
13. [Glosario PropTech](#13-glosario)
14. [Checklist Go-to-Production](#14-checklist)
15. [Plan de Onboarding 4 Semanas](#15-onboarding)
16. [Matriz de Priorización de Features](#16-backlog)
17. [Guía de Configuración NotebookLM](#17-notebooklm)

---

## 1. VISIÓN GENERAL DEL PRODUCTO

### 1.1 ¿Qué es Quintas-CRM?

Quintas-CRM es una plataforma integral de gestión inmobiliaria diseñada específicamente para desarrolladoras que comercializan proyectos rurales, campestres y de lotificación (quintas, terrenos, fincas). Es el primer CRM del mercado mexicano que coloca el **mapa interactivo georeferenciado como núcleo operativo** del sistema, en lugar de tratarlo como una funcionalidad secundaria.

El sistema resuelve el problema crítico que enfrentan las desarrolladoras inmobiliarias: la información dispersa entre hojas de cálculo, llamadas telefónicas, mensajes de WhatsApp y archivos físicos que generan errores costosos, pérdida de leads y ventas duplicadas.

### 1.2 Propuesta de Valor Central

**Para Directores Generales:** Control total del inventario en tiempo real, reportes financieros automatizados y reducción del 70% en tiempo de gestión operativa.

**Para Directores de Ventas:** Pipeline visual de leads, asignación automática desde Facebook/Instagram, seguimiento de comisiones y dashboard de rendimiento por vendedor.

**Para Vendedores:** Herramienta móvil para cerrar ventas en campo, calculadora de financiamiento integrada y acceso instantáneo a disponibilidad de lotes.

**Para Clientes:** Portal personal con estado de cuenta, tabla de amortización, descarga de documentos y notificaciones automáticas de pagos.

### 1.3 Caso de Uso Principal: Quintas de Otinapa

El sistema fue diseñado e implementado inicialmente para **Quintas de Otinapa**, un desarrollo inmobiliario de montaña ubicado en Durango, México, con las siguientes características:

- **~1,500 lotes** georeferenciados en múltiples zonas (A, B, C)
- **65 vendedores** activos que requieren gestión de leads y comisiones
- **Integración con Meta** (Facebook/Instagram) para captura automática de leads
- **Sistema de pagos** con amortización mensual y cálculo de mora
- **Portal de clientes** para seguimiento de inversión

### 1.4 Métricas de Impacto Proyectadas

| Métrica | Antes (Manual) | Después (Quintas-CRM) | Mejora |
|---------|---------------|----------------------|--------|
| Tiempo para cerrar venta | 2-3 días | 15-30 minutos | **-95%** |
| Errores en cálculos | 15-20% de casos | 0% (automatizado) | **-100%** |
| Llamadas diarias a oficina | 30-40 | 3-5 | **-87%** |
| Tiempo de consulta de disponibilidad | 10-15 min | Instantáneo | **-100%** |
| Cartera vencida | Alta | Reducción 40% | **-40%** |
| Satisfacción del cliente | 60% | 90%+ | **+50%** |

### 1.5 Inversión y ROI

- **Inversión de Desarrollo:** $145,000 - $200,000 MXN (única vez)
- **Infraestructura Mensual:** ~$130 USD/mes (Vercel + AWS + Mapbox)
- **Ahorros Mensuales Estimados:** $21,500 MXN
- **Período de Recuperación:** 6.7 meses
- **ROI Primer Año:** 78%

---

## 2. ARQUITECTURA DEL SISTEMA

### 2.1 Diagrama de Arquitectura C4 (Nivel Contexto)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACTORES EXTERNOS                              │
│                                                                  │
│  [Vendedor]  [Cliente]  [Admin]  [Facebook Ads]  [WhatsApp]     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / REST API
┌──────────────────────────▼──────────────────────────────────────┐
│                  QUINTAS-CRM PLATFORM                            │
│                                                                  │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  FRONTEND LAYER │  │  API LAYER   │  │  DATA LAYER      │   │
│  │  Next.js 14     │◄─►  Directus   │◄─►  MySQL 8.0       │   │
│  │  Mapbox GL JS   │  │  Custom API  │  │  GeoJSON Files   │   │
│  │  Tailwind CSS   │  │  Node.js     │  │  Redis Cache     │   │
│  └─────────────────┘  └──────────────┘  └──────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              EXTERNAL INTEGRATIONS                        │   │
│  │  Meta Lead Ads │ WhatsApp Business │ SendGrid │ Mapbox   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Diagrama de Arquitectura C4 (Nivel Contenedores)

```
INTERNET
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│  CDN / VERCEL EDGE NETWORK                                     │
│  - SSL/TLS Termination                                         │
│  - Static Asset Caching                                        │
│  - DDoS Protection                                             │
└───────────────────────────┬───────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌────────────────┐  ┌────────────────┐
│  NEXT.JS APP  │  │  DIRECTUS CRM  │  │  CUSTOM API    │
│  (Vercel)     │  │  (VPS/Docker)  │  │  (Node.js)     │
│               │  │                │  │                │
│  - Mapa       │  │  - REST API    │  │  - Webhooks    │
│  - Dashboard  │  │  - Admin UI    │  │  - Lead Mgmt   │
│  - Portal     │  │  - Auth        │  │  - Comisiones  │
│  - Reportes   │  │  - Permisos    │  │  - Pagos       │
└───────┬───────┘  └───────┬────────┘  └───────┬────────┘
        │                  │                    │
        └──────────────────┼────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  MySQL 8.0  │
                    │  (AWS RDS)  │
                    │             │
                    │  25+ tablas │
                    │  8 SP       │
                    │  8 Triggers │
                    └─────────────┘
```

### 2.3 Flujo de Datos Principal

**Flujo 1: Captura y Asignación de Lead**
```
Facebook Ad → Lead Form → Meta Webhook → /api/leads/webhook
    → Validación de duplicados → Round-Robin Assignment
    → Notificación WhatsApp al Vendedor → Lead en Dashboard
```

**Flujo 2: Visualización del Mapa**
```
Usuario abre mapa → Frontend solicita GeoJSON → API consulta MySQL
    → Transforma a GeoJSON → Mapbox renderiza polígonos
    → Colores por estado → Usuario hace click → Panel lateral
```

**Flujo 3: Proceso de Venta Completo**
```
Vendedor selecciona lote → Verifica disponibilidad → Registra cliente
    → Calcula financiamiento → Genera contrato → Cliente firma
    → Sistema actualiza estado del lote → Genera tabla de amortización
    → Calcula comisión del vendedor → Notifica al cliente
```

**Flujo 4: Registro de Pago**
```
Pago recibido → Vendedor/Admin registra → Sistema valida monto
    → Actualiza tabla de amortización → Calcula mora si aplica
    → Genera recibo → Notifica al cliente → Actualiza dashboard
```

---

## 3. STACK TECNOLÓGICO DETALLADO

### 3.1 Frontend

| Tecnología | Versión | Propósito | Justificación |
|-----------|---------|-----------|---------------|
| **Next.js** | 14.x | Framework principal | App Router, SSR, API Routes integradas |
| **React** | 18.x | UI Library | Ecosistema maduro, componentes reutilizables |
| **TypeScript** | 5.x | Tipado estático | Previene errores en runtime, mejor DX |
| **Tailwind CSS** | 3.x | Estilos | Desarrollo rápido, diseño consistente |
| **Mapbox GL JS** | 3.x | Mapas interactivos | Mejor rendimiento con GeoJSON, vista satelital |
| **Zustand** | 4.x | Estado global | Ligero, sin boilerplate de Redux |
| **React Hook Form** | 7.x | Formularios | Performance, validación integrada |
| **Zod** | 3.x | Validación de esquemas | Type-safe validation |
| **SWR** | 2.x | Data fetching | Cache automático, revalidación |
| **Axios** | 1.x | Cliente HTTP | Interceptors, manejo de errores |

### 3.2 Backend

| Tecnología | Versión | Propósito | Justificación |
|-----------|---------|-----------|---------------|
| **Node.js** | 20.x | Runtime | LTS, performance, ecosistema npm |
| **Directus** | 11.x | Headless CMS/CRM | Admin UI gratis, REST API automática |
| **Express.js** | 4.x | API personalizada | Middleware flexible, amplio ecosistema |
| **MySQL** | 8.0 | Base de datos | ACID compliance, JSON support, performance |
| **Prisma** | 5.x | ORM | Type-safe queries, migraciones |
| **JWT** | — | Autenticación | Stateless, escalable |
| **bcrypt** | — | Hash de passwords | Estándar de industria |
| **Winston** | — | Logging | Niveles de log, transports múltiples |

### 3.3 Infraestructura

| Servicio | Proveedor | Costo/mes | Propósito |
|---------|-----------|-----------|-----------|
| **Frontend Hosting** | Vercel Pro | $20 USD | Deploy automático, CDN global |
| **Base de Datos** | AWS RDS MySQL | $50 USD | Managed DB, backups automáticos |
| **Almacenamiento** | AWS S3 | $10 USD | Documentos, contratos, fotos |
| **Mapas** | Mapbox | $50 USD | Hasta 50k cargas/mes |
| **Email** | SendGrid | $15 USD | Notificaciones transaccionales |
| **Total** | — | **~$145 USD** | — |

### 3.4 Herramientas de Desarrollo

- **TRAE:** Generación de infraestructura backend con IA
- **KOMBAI:** Conversión de diseños Figma a código React
- **Cursor/VS Code:** IDE principal con extensiones TypeScript
- **Figma:** Diseño UI/UX y prototipado
- **GitHub Actions:** CI/CD pipeline automatizado
- **Docker:** Containerización para desarrollo local consistente

---

## 4. LÓGICA DE NEGOCIO PROPTECH

### 4.1 Gestión del Inventario de Lotes

El inventario es el activo central del sistema. Cada lote tiene un ciclo de vida definido con estados que se actualizan en tiempo real y se reflejan inmediatamente en el mapa interactivo.

**Estados de un Lote:**

```
DISPONIBLE (Verde #10B981)
    │
    ▼ [Vendedor inicia proceso]
APARTADO (Amarillo #F59E0B)
    │ [Tiempo límite: configurable, default 72 horas]
    ├─── [Venta confirmada] ──► VENDIDO (Rojo #EF4444)
    │                               │
    │                               ▼ [Pagos completados]
    │                           LIQUIDADO (Morado #8B5CF6)
    │
    └─── [Apartado vence] ──► DISPONIBLE (Verde)

BLOQUEADO (Gris #6B7280) ← [Admin bloquea por razones administrativas]
```

**Regla crítica:** Un lote en estado APARTADO bloquea automáticamente cualquier intento de venta paralela. El sistema genera una alerta si el apartado no se convierte en venta dentro del período configurado.

### 4.2 Cálculo de Financiamiento

El sistema implementa la fórmula estándar de amortización francesa (cuota fija):

```
PMT = PV × [r(1+r)^n] / [(1+r)^n - 1]

Donde:
  PMT = Pago mensual
  PV  = Saldo a financiar (Precio - Enganche)
  r   = Tasa de interés mensual (tasa anual / 12)
  n   = Número de meses del plazo
```

**Ejemplo práctico:**
- Precio del lote: $350,000 MXN
- Enganche (30%): $105,000 MXN
- Saldo a financiar: $245,000 MXN
- Tasa anual: 12% → Tasa mensual: 1%
- Plazo: 60 meses
- **Pago mensual: $5,445 MXN**

### 4.3 Cálculo de Mora

```
Mora = Saldo vencido × (Tasa de mora diaria × Días de atraso)
Tasa de mora diaria = Tasa de mora anual / 365
```

El sistema calcula y aplica mora automáticamente al registrar un pago tardío, mostrando el desglose al cliente y al vendedor.

### 4.4 Sistema de Comisiones

El sistema soporta múltiples esquemas de comisión configurables:

| Esquema | Descripción | Cuándo se paga |
|---------|-------------|----------------|
| **Al Contrato** | % del precio total al firmar | Día de firma |
| **Al Enganche** | % del enganche recibido | Al recibir enganche |
| **Proporcional** | % de cada pago recibido | Con cada mensualidad |
| **Escalonado** | % aumenta por volumen mensual | Fin de mes |

**Ejemplo de comisión escalonada:**
- 1-3 ventas/mes: 3% del precio
- 4-6 ventas/mes: 4% del precio
- 7+ ventas/mes: 5% del precio

### 4.5 Asignación Round-Robin de Leads

El algoritmo de asignación garantiza distribución equitativa de leads entre vendedores activos:

```typescript
// Pseudocódigo del algoritmo
function assignLead(lead: Lead): Vendedor {
  const vendedoresActivos = getVendedoresActivos();
  
  // Obtener el vendedor con menos leads asignados hoy
  const vendedorConMenosLeads = vendedoresActivos
    .sort((a, b) => a.leadsHoy - b.leadsHoy)[0];
  
  // Si hay empate, usar el que lleva más tiempo sin recibir lead
  if (hayEmpate) {
    return vendedorMasAntiguo;
  }
  
  return vendedorConMenosLeads;
}
```

**Reglas adicionales de asignación:**
- Vendedores en vacaciones o inactivos se excluyen automáticamente
- Se puede configurar asignación por zona geográfica del lead
- El admin puede reasignar manualmente con registro de motivo
- Si no hay vendedores disponibles, el lead va a una cola de espera

---

## 5. CICLO DE VIDA DEL LEAD

### 5.1 Diagrama Completo del Ciclo

```
CAPTURA
  │
  ├── Facebook/Instagram Lead Ads ──► Webhook automático
  ├── Formulario web ──────────────► API directa
  ├── WhatsApp Business ───────────► Integración manual
  └── Referido ────────────────────► Registro manual
  │
  ▼
VALIDACIÓN Y DEDUPLICACIÓN
  │
  ├── ¿Existe lead con mismo teléfono? ──► Merge con lead existente
  ├── ¿Existe lead con mismo email? ────► Notificar al vendedor asignado
  └── Lead nuevo ────────────────────────► Continuar flujo
  │
  ▼
ASIGNACIÓN (Round-Robin automático)
  │
  └── Notificación inmediata al vendedor (WhatsApp + Email)
  │
  ▼
ESTADOS DEL LEAD
  │
  NUEVO ──► CONTACTADO ──► INTERESADO ──► CLIENTE
                │                │
                └── NO INTERESADO └── PERDIDO
  │
  ▼
CONVERSIÓN A CLIENTE
  │
  └── Se crea registro en tabla `clientes`
  └── Se vincula con venta
  └── Se activa portal del cliente
```

### 5.2 Tiempos de Respuesta Objetivo (SLA)

| Etapa | Tiempo Objetivo | Alerta si supera |
|-------|----------------|-----------------|
| Lead capturado → Notificación al vendedor | < 2 minutos | 5 minutos |
| Notificación → Primer contacto del vendedor | < 30 minutos | 2 horas |
| Primer contacto → Calificación | < 24 horas | 48 horas |
| Lead calificado → Visita/Demo | < 72 horas | 1 semana |
| Demo → Cierre | Variable | 30 días |

### 5.3 Scoring de Leads (Calificación)

El sistema asigna automáticamente un score a cada lead basado en:

| Factor | Puntos |
|--------|--------|
| Completó formulario completo | +20 |
| Proporcionó presupuesto | +15 |
| Mencionó lote específico | +15 |
| Fuente: Facebook (alta intención) | +10 |
| Fuente: Referido | +20 |
| Respondió en < 1 hora | +10 |
| Solicitó visita | +25 |
| **Score máximo** | **115** |

**Clasificación:**
- 80-115: Lead Caliente 🔥 (prioridad máxima)
- 50-79: Lead Tibio 🌡️ (seguimiento en 24h)
- 0-49: Lead Frío ❄️ (nurturing automático)

---

## 6. MODELO DE DATOS COMPLETO

### 6.1 Entidades Principales (25+ tablas)

#### Tabla: `lotes`
```sql
CREATE TABLE lotes (
  id                    INT PRIMARY KEY AUTO_INCREMENT,
  numero_lote           VARCHAR(20) UNIQUE NOT NULL,  -- Ej: "QO-M1-L001"
  sku                   VARCHAR(30) UNIQUE,            -- Código único de venta
  zona                  ENUM('A','B','C') NOT NULL,
  manzana               VARCHAR(10) NOT NULL,
  area_m2               DECIMAL(10,2) NOT NULL,
  frente_m              DECIMAL(10,2) NOT NULL,
  fondo_m               DECIMAL(10,2) NOT NULL,
  estatus               ENUM('disponible','apartado','vendido',
                             'liquidado','bloqueado') DEFAULT 'disponible',
  precio_lista          DECIMAL(12,2) NOT NULL,
  precio_final          DECIMAL(12,2),
  enganche_minimo       DECIMAL(12,2),
  topografia            ENUM('plana','irregular','pendiente') DEFAULT 'plana',
  vista                 ENUM('montaña','calle','interna','lago') DEFAULT 'interna',
  servicios_disponibles JSON,                          -- ["luz","agua","drenaje"]
  geometria             JSON NOT NULL,                 -- GeoJSON Polygon
  latitud               DECIMAL(32,20),
  longitud              DECIMAL(32,20),
  fotos                 JSON,                          -- Array de URLs S3
  notas                 TEXT,
  apartado_hasta        DATETIME,                      -- Expiración del apartado
  creado_en             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_zona (zona),
  INDEX idx_estatus (estatus),
  INDEX idx_precio (precio_lista),
  INDEX idx_numero_lote (numero_lote),
  INDEX idx_apartado_hasta (apartado_hasta)
);
```

#### Tabla: `clientes`
```sql
CREATE TABLE clientes (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  nombre            VARCHAR(100) NOT NULL,
  apellido          VARCHAR(100) NOT NULL,
  email             VARCHAR(150) UNIQUE,
  telefono          VARCHAR(20) NOT NULL,
  telefono_alt      VARCHAR(20),
  rfc               VARCHAR(13),
  curp              VARCHAR(18),
  fecha_nacimiento  DATE,
  direccion         TEXT,
  colonia           VARCHAR(100),
  ciudad            VARCHAR(100),
  estado_republica  VARCHAR(100),
  codigo_postal     VARCHAR(10),
  ocupacion         VARCHAR(100),
  ingresos_mensuales DECIMAL(12,2),
  como_nos_conocio  ENUM('facebook','instagram','referido','web','otro'),
  usuario_id        INT,                               -- FK a usuarios
  activo            BOOLEAN DEFAULT TRUE,
  creado_en         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_email (email),
  INDEX idx_telefono (telefono),
  INDEX idx_rfc (rfc),
  FULLTEXT idx_nombre (nombre, apellido)
);
```

#### Tabla: `vendedores`
```sql
CREATE TABLE vendedores (
  id                    INT PRIMARY KEY AUTO_INCREMENT,
  nombre                VARCHAR(100) NOT NULL,
  apellido              VARCHAR(100) NOT NULL,
  email                 VARCHAR(150) UNIQUE NOT NULL,
  telefono              VARCHAR(20),
  zona_asignada         ENUM('A','B','C','todas') DEFAULT 'todas',
  meta_ventas_mensual   DECIMAL(12,2) DEFAULT 0,
  porcentaje_comision   DECIMAL(5,2) DEFAULT 3.00,
  esquema_comision      ENUM('al_contrato','al_enganche',
                             'proporcional','escalonado') DEFAULT 'al_contrato',
  activo                BOOLEAN DEFAULT TRUE,
  disponible            BOOLEAN DEFAULT TRUE,          -- Para round-robin
  leads_hoy             INT DEFAULT 0,                 -- Contador diario
  usuario_id            INT,
  creado_en             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_email (email),
  INDEX idx_activo (activo),
  INDEX idx_disponible (disponible)
);
```

#### Tabla: `leads`
```sql
CREATE TABLE leads (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  nombre            VARCHAR(100) NOT NULL,
  email             VARCHAR(150),
  telefono          VARCHAR(20) NOT NULL,
  mensaje           TEXT,
  presupuesto       DECIMAL(12,2),
  lote_interes      VARCHAR(20),                       -- Número de lote
  zona_interes      ENUM('A','B','C','cualquiera'),
  estado            ENUM('nuevo','contactado','interesado',
                         'no_interesado','cliente','perdido') DEFAULT 'nuevo',
  score             INT DEFAULT 0,                     -- Lead scoring
  temperatura       ENUM('frio','tibio','caliente') DEFAULT 'frio',
  vendedor_id       INT,
  source            ENUM('facebook','instagram','web',
                         'referido','whatsapp','otro') DEFAULT 'web',
  utm_source        VARCHAR(100),
  utm_campaign      VARCHAR(100),
  meta_lead_id      VARCHAR(100),                      -- ID de Facebook
  meta_ad_id        VARCHAR(100),
  meta_form_id      VARCHAR(100),
  notas             TEXT,
  fecha_contacto    DATETIME,
  fecha_visita      DATETIME,
  creado_en         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (vendedor_id) REFERENCES vendedores(id),
  INDEX idx_estado (estado),
  INDEX idx_vendedor (vendedor_id),
  INDEX idx_score (score),
  INDEX idx_source (source),
  INDEX idx_telefono (telefono),
  INDEX idx_meta_lead_id (meta_lead_id)
);
```

#### Tabla: `ventas`
```sql
CREATE TABLE ventas (
  id                  INT PRIMARY KEY AUTO_INCREMENT,
  folio               VARCHAR(20) UNIQUE NOT NULL,     -- Ej: "QO-2026-0001"
  lote_id             INT NOT NULL,
  cliente_id          INT NOT NULL,
  vendedor_id         INT NOT NULL,
  precio_lista        DECIMAL(12,2) NOT NULL,
  descuento           DECIMAL(12,2) DEFAULT 0,
  precio_final        DECIMAL(12,2) NOT NULL,
  enganche            DECIMAL(12,2),
  saldo_financiar     DECIMAL(12,2),
  saldo_restante      DECIMAL(12,2),
  plazo_meses         INT,
  tasa_interes_anual  DECIMAL(5,2) DEFAULT 0,
  pago_mensual        DECIMAL(12,2),
  forma_pago          ENUM('contado','mensualidades','personalizado'),
  estado              ENUM('en_proceso','apartado','contrato',
                           'en_pagos','liquidado','cancelado') DEFAULT 'en_proceso',
  fecha_apartado      DATE,
  fecha_contrato      DATE,
  fecha_liquidacion   DATE,
  contrato_firmado    BOOLEAN DEFAULT FALSE,
  url_contrato        VARCHAR(500),                    -- URL en S3
  notas               TEXT,
  creado_en           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (lote_id) REFERENCES lotes(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (vendedor_id) REFERENCES vendedores(id),
  UNIQUE KEY uk_lote_activa (lote_id, estado),        -- Evita ventas duplicadas
  INDEX idx_folio (folio),
  INDEX idx_estado (estado),
  INDEX idx_vendedor (vendedor_id),
  INDEX idx_cliente (cliente_id)
);
```

#### Tabla: `amortizacion`
```sql
CREATE TABLE amortizacion (
  id                  INT PRIMARY KEY AUTO_INCREMENT,
  venta_id            INT NOT NULL,
  numero_pago         INT NOT NULL,
  fecha_vencimiento   DATE NOT NULL,
  capital             DECIMAL(12,2) NOT NULL,
  interes             DECIMAL(12,2) NOT NULL,
  total               DECIMAL(12,2) NOT NULL,
  saldo_restante      DECIMAL(12,2) NOT NULL,
  estado              ENUM('pendiente','pagado','atrasado',
                           'parcial','cancelado') DEFAULT 'pendiente',
  fecha_pago          DATE,
  monto_pagado        DECIMAL(12,2),
  mora_aplicada       DECIMAL(12,2) DEFAULT 0,
  
  FOREIGN KEY (venta_id) REFERENCES ventas(id),
  INDEX idx_venta (venta_id),
  INDEX idx_estado (estado),
  INDEX idx_fecha_vencimiento (fecha_vencimiento)
);
```

#### Tabla: `pagos`
```sql
CREATE TABLE pagos (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  venta_id          INT NOT NULL,
  amortizacion_id   INT,
  monto             DECIMAL(12,2) NOT NULL,
  mora              DECIMAL(12,2) DEFAULT 0,
  total_cobrado     DECIMAL(12,2) NOT NULL,
  metodo_pago       ENUM('efectivo','transferencia','tarjeta',
                         'cheque','deposito') DEFAULT 'efectivo',
  referencia        VARCHAR(100),
  comprobante_url   VARCHAR(500),
  registrado_por    INT,                               -- FK a usuarios
  notas             TEXT,
  creado_en         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (venta_id) REFERENCES ventas(id),
  FOREIGN KEY (amortizacion_id) REFERENCES amortizacion(id),
  INDEX idx_venta (venta_id),
  INDEX idx_creado_en (creado_en)
);
```

#### Tabla: `comisiones`
```sql
CREATE TABLE comisiones (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  venta_id          INT NOT NULL,
  vendedor_id       INT NOT NULL,
  pago_id           INT,                               -- Si es proporcional
  monto_base        DECIMAL(12,2) NOT NULL,
  porcentaje        DECIMAL(5,2) NOT NULL,
  monto_comision    DECIMAL(12,2) NOT NULL,
  tipo              ENUM('venta','enganche','mensualidad','bono'),
  estado            ENUM('pendiente','aprobada','pagada','cancelada') DEFAULT 'pendiente',
  fecha_aprobacion  DATE,
  fecha_pago        DATE,
  aprobado_por      INT,
  notas             TEXT,
  creado_en         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (venta_id) REFERENCES ventas(id),
  FOREIGN KEY (vendedor_id) REFERENCES vendedores(id),
  INDEX idx_vendedor (vendedor_id),
  INDEX idx_estado (estado),
  INDEX idx_tipo (tipo)
);
```

#### Tabla: `usuarios`
```sql
CREATE TABLE usuarios (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  email             VARCHAR(150) UNIQUE NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  nombre            VARCHAR(100) NOT NULL,
  apellido          VARCHAR(100) NOT NULL,
  rol               ENUM('admin','gerente','vendedor','cliente') NOT NULL,
  activo            BOOLEAN DEFAULT TRUE,
  ultimo_login      DATETIME,
  token_reset       VARCHAR(255),
  token_expira      DATETIME,
  creado_en         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_rol (rol)
);
```

#### Tabla: `documentos`
```sql
CREATE TABLE documentos (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  venta_id          INT,
  cliente_id        INT,
  tipo              ENUM('contrato','ine','comprobante_domicilio',
                         'comprobante_ingresos','recibo_pago',
                         'escritura','otro'),
  nombre            VARCHAR(200) NOT NULL,
  url_s3            VARCHAR(500) NOT NULL,
  tamaño_bytes      INT,
  subido_por        INT,
  verificado        BOOLEAN DEFAULT FALSE,
  creado_en         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (venta_id) REFERENCES ventas(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  INDEX idx_venta (venta_id),
  INDEX idx_tipo (tipo)
);
```

#### Tabla: `notificaciones`
```sql
CREATE TABLE notificaciones (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id        INT NOT NULL,
  tipo              ENUM('nuevo_lead','pago_vencido','venta_cerrada',
                         'comision_aprobada','apartado_vence','sistema'),
  titulo            VARCHAR(200) NOT NULL,
  mensaje           TEXT NOT NULL,
  leida             BOOLEAN DEFAULT FALSE,
  url_accion        VARCHAR(500),
  creado_en         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_usuario (usuario_id),
  INDEX idx_leida (leida)
);
```

#### Tabla: `auditoria`
```sql
CREATE TABLE auditoria (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  tabla             VARCHAR(50) NOT NULL,
  registro_id       INT NOT NULL,
  accion            ENUM('INSERT','UPDATE','DELETE'),
  datos_anteriores  JSON,
  datos_nuevos      JSON,
  usuario_id        INT,
  ip_address        VARCHAR(45),
  creado_en         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_tabla_registro (tabla, registro_id),
  INDEX idx_usuario (usuario_id),
  INDEX idx_creado_en (creado_en)
);
```

### 6.2 Stored Procedures Clave

```sql
-- SP: Registrar venta completa (transacción atómica)
DELIMITER //
CREATE PROCEDURE sp_registrar_venta(
  IN p_lote_id INT,
  IN p_cliente_id INT,
  IN p_vendedor_id INT,
  IN p_precio_final DECIMAL(12,2),
  IN p_enganche DECIMAL(12,2),
  IN p_plazo_meses INT,
  IN p_tasa_anual DECIMAL(5,2),
  IN p_forma_pago ENUM('contado','mensualidades','personalizado'),
  OUT p_venta_id INT,
  OUT p_folio VARCHAR(20)
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  
  START TRANSACTION;
  
  -- Verificar disponibilidad del lote
  IF (SELECT estatus FROM lotes WHERE id = p_lote_id) != 'disponible' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lote no disponible';
  END IF;
  
  -- Generar folio único
  SET p_folio = CONCAT('QO-', YEAR(NOW()), '-', LPAD(
    (SELECT COUNT(*)+1 FROM ventas WHERE YEAR(creado_en) = YEAR(NOW())), 4, '0'
  ));
  
  -- Calcular pago mensual
  SET @saldo = p_precio_final - p_enganche;
  SET @tasa_mensual = p_tasa_anual / 12 / 100;
  SET @pago_mensual = @saldo * (@tasa_mensual * POW(1+@tasa_mensual, p_plazo_meses))
                      / (POW(1+@tasa_mensual, p_plazo_meses) - 1);
  
  -- Insertar venta
  INSERT INTO ventas (folio, lote_id, cliente_id, vendedor_id, precio_final,
                      enganche, saldo_financiar, saldo_restante, plazo_meses,
                      tasa_interes_anual, pago_mensual, forma_pago, estado)
  VALUES (p_folio, p_lote_id, p_cliente_id, p_vendedor_id, p_precio_final,
          p_enganche, @saldo, @saldo, p_plazo_meses, p_tasa_anual,
          @pago_mensual, p_forma_pago, 'apartado');
  
  SET p_venta_id = LAST_INSERT_ID();
  
  -- Actualizar estado del lote
  UPDATE lotes SET estatus = 'apartado',
                   apartado_hasta = DATE_ADD(NOW(), INTERVAL 72 HOUR)
  WHERE id = p_lote_id;
  
  -- Generar tabla de amortización
  CALL sp_generar_amortizacion(p_venta_id, @saldo, @tasa_mensual, p_plazo_meses);
  
  -- Calcular comisión
  CALL sp_generar_comision(p_venta_id, p_vendedor_id, p_precio_final);
  
  COMMIT;
END //
DELIMITER ;
```

### 6.3 Triggers de Auditoría

```sql
-- Trigger: Auditar cambios en lotes
CREATE TRIGGER tr_lotes_after_update
AFTER UPDATE ON lotes
FOR EACH ROW
BEGIN
  INSERT INTO auditoria (tabla, registro_id, accion, datos_anteriores, datos_nuevos)
  VALUES ('lotes', NEW.id, 'UPDATE',
    JSON_OBJECT('estatus', OLD.estatus, 'precio_lista', OLD.precio_lista),
    JSON_OBJECT('estatus', NEW.estatus, 'precio_lista', NEW.precio_lista)
  );
END;

-- Trigger: Actualizar saldo restante al registrar pago
CREATE TRIGGER tr_pagos_after_insert
AFTER INSERT ON pagos
FOR EACH ROW
BEGIN
  UPDATE ventas
  SET saldo_restante = saldo_restante - NEW.monto
  WHERE id = NEW.venta_id;
  
  -- Si saldo = 0, marcar como liquidado
  UPDATE ventas SET estado = 'liquidado', fecha_liquidacion = CURDATE()
  WHERE id = NEW.venta_id AND saldo_restante <= 0;
  
  -- Si liquidado, actualizar lote
  UPDATE lotes SET estatus = 'liquidado'
  WHERE id = (SELECT lote_id FROM ventas WHERE id = NEW.venta_id)
  AND (SELECT estado FROM ventas WHERE id = NEW.venta_id) = 'liquidado';
END;
```

---

## 7. REGLAS DE VALIDACIÓN Y NEGOCIO

### 7.1 Reglas de Inventario

**R-INV-001:** Un lote solo puede tener UNA venta activa simultáneamente. El sistema usa una restricción UNIQUE en `(lote_id, estado)` para estados activos.

**R-INV-002:** Un apartado expira automáticamente a las 72 horas (configurable). Un job cron verifica cada hora y libera apartados vencidos.

**R-INV-003:** Solo el rol `admin` puede cambiar un lote a estado `bloqueado`. Los vendedores solo pueden iniciar el proceso de apartado.

**R-INV-004:** El precio final de venta no puede ser menor al 85% del precio de lista sin aprobación del gerente.

**R-INV-005:** El enganche mínimo es del 20% del precio final (configurable por proyecto).

### 7.2 Reglas de Leads

**R-LEAD-001: Deduplicación por teléfono.** Si llega un lead con el mismo número de teléfono que uno existente (en cualquier estado), el sistema NO crea un duplicado. En cambio, agrega una nota al lead existente y notifica al vendedor asignado.

```typescript
async function checkDuplicateLead(telefono: string): Promise<Lead | null> {
  // Normalizar teléfono (remover espacios, guiones, código de país)
  const telefonoNormalizado = normalizarTelefono(telefono);
  
  return await db.leads.findFirst({
    where: {
      OR: [
        { telefono: telefonoNormalizado },
        { telefono: telefono }
      ]
    }
  });
}
```

**R-LEAD-002: Deduplicación por email.** Si el email ya existe, se fusiona con el lead existente y se notifica al vendedor.

**R-LEAD-003:** Un lead en estado `cliente` no puede volver a estados anteriores.

**R-LEAD-004:** Si un lead no es contactado en 2 horas, el sistema envía una alerta al gerente.

**R-LEAD-005:** Los leads de Facebook deben procesarse en menos de 5 minutos para maximizar la tasa de contacto (ventana de atención caliente).

### 7.3 Reglas de Ventas

**R-VENTA-001:** No se puede registrar una venta sobre un lote en estado `vendido`, `liquidado` o `bloqueado`.

**R-VENTA-002:** El folio de venta se genera automáticamente con el formato `QO-YYYY-NNNN` y es inmutable.

**R-VENTA-003:** Para cambiar el estado de `apartado` a `contrato`, se requiere subir el documento de contrato firmado.

**R-VENTA-004:** Una venta cancelada libera el lote automáticamente a estado `disponible`.

**R-VENTA-005:** El sistema no permite registrar pagos que excedan el saldo restante de la venta.

### 7.4 Reglas de Comisiones

**R-COM-001:** Las comisiones se calculan automáticamente al registrar una venta. No se pueden crear manualmente sin aprobación del admin.

**R-COM-002:** Una comisión en estado `pagada` no puede ser modificada ni cancelada.

**R-COM-003:** Si una venta es cancelada, las comisiones pendientes se cancelan automáticamente. Las comisiones ya pagadas requieren proceso de devolución manual.

**R-COM-004:** El sistema mantiene un historial inmutable de todas las comisiones para auditoría.

### 7.5 Reglas de Seguridad

**R-SEG-001:** Máximo 5 intentos de login fallidos antes de bloquear la cuenta por 15 minutos.

**R-SEG-002:** Los tokens JWT expiran en 7 días. Los refresh tokens expiran en 30 días.

**R-SEG-003:** Todos los endpoints que modifican datos requieren autenticación JWT válida.

**R-SEG-004:** Los vendedores solo pueden ver leads y ventas asignados a ellos. Los gerentes ven todo su equipo. Los admins ven todo.

**R-SEG-005:** Las contraseñas deben tener mínimo 8 caracteres, una mayúscula, un número y un carácter especial.

---

## 8. INTEGRACIONES CRÍTICAS

### 8.1 Meta Lead Ads (Facebook/Instagram)

**Propósito:** Captura automática de leads desde campañas de publicidad en Facebook e Instagram, eliminando la entrada manual de datos.

**Flujo de Integración:**
```
1. Usuario ve anuncio en Facebook/Instagram
2. Hace click en "Más información" o "Solicitar"
3. Se abre formulario nativo de Meta (pre-llenado con datos del perfil)
4. Usuario envía formulario
5. Meta envía webhook a: POST /api/leads/webhook
6. Sistema procesa en < 2 minutos
7. Lead aparece en dashboard del vendedor asignado
8. Vendedor recibe notificación por WhatsApp
```

**Configuración del Webhook:**
```
URL: https://tu-dominio.com/api/leads/webhook
Verify Token: [generado aleatoriamente, guardado en .env]
Campos suscritos: leadgen
Versión API: v18.0
```

**Campos del Formulario de Lead Ads:**
```json
{
  "full_name": "Nombre completo",
  "email": "Correo electrónico",
  "phone_number": "Teléfono",
  "custom_presupuesto": "¿Cuál es tu presupuesto?",
  "custom_zona": "¿Qué zona te interesa? (A/B/C)",
  "custom_como_conociste": "¿Cómo nos conociste?"
}
```

**Verificación de Firma (Seguridad):**
```typescript
function verifyFacebookSignature(payload: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.META_APP_SECRET!)
    .update(payload)
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}
```

### 8.2 WhatsApp Business API

**Propósito:** Notificaciones instantáneas a vendedores cuando reciben un nuevo lead, y comunicación con clientes sobre pagos y actualizaciones.

**Templates de Mensajes Aprobados:**

*Template 1: Nuevo Lead para Vendedor*
```
🏔️ NUEVO LEAD - Quintas de Otinapa

Hola {{vendedor_nombre}}, tienes un nuevo prospecto:

👤 Nombre: {{lead_nombre}}
📱 Teléfono: {{lead_telefono}}
💰 Presupuesto: {{lead_presupuesto}}
🗺️ Zona de interés: {{lead_zona}}
📍 Fuente: {{lead_source}}

⚡ Contáctalo en los próximos 30 minutos para maximizar la conversión.

Ver lead: {{url_lead}}
```

*Template 2: Recordatorio de Pago para Cliente*
```
🏔️ Quintas de Otinapa - Recordatorio de Pago

Hola {{cliente_nombre}},

Tu pago #{{numero_pago}} vence el {{fecha_vencimiento}}.

💰 Monto: ${{monto}} MXN
🏠 Lote: {{numero_lote}}

Realiza tu pago antes de la fecha para evitar cargos por mora.

Ver estado de cuenta: {{url_portal}}
```

### 8.3 Mapbox GL JS

**Propósito:** Renderizado del mapa interactivo con polígonos georeferenciados de los lotes.

**Configuración del Mapa:**
```typescript
const mapConfig = {
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  center: [-104.6532, 24.0277],  // Coordenadas de Quintas de Otinapa
  zoom: 15,
  pitch: 45,                      // Vista 3D
  bearing: -17.6
};

// Colores por estado
const COLORES_ESTADO = {
  disponible: '#10B981',   // Verde
  apartado:   '#F59E0B',   // Amarillo
  vendido:    '#EF4444',   // Rojo
  liquidado:  '#8B5CF6',   // Morado
  bloqueado:  '#6B7280'    // Gris
};
```

**Formato GeoJSON de Lotes:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id_lote": 1,
        "sku": "QO-M1-L001",
        "numero_lote": "M1-L001",
        "zona": "A",
        "estatus": "disponible",
        "color": "#10B981",
        "area_m2": 300.5,
        "precio_lista": 350000,
        "topografia": "plana"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[lng1,lat1],[lng2,lat2],[lng3,lat3],[lng1,lat1]]]
      }
    }
  ]
}
```

### 8.4 AWS S3 (Almacenamiento de Documentos)

**Estructura de Buckets:**
```
quintas-otinapa-docs/
├── contratos/
│   └── {venta_folio}/
│       ├── contrato_firmado.pdf
│       └── contrato_borrador.pdf
├── clientes/
│   └── {cliente_id}/
│       ├── ine_frente.jpg
│       ├── ine_reverso.jpg
│       └── comprobante_domicilio.pdf
├── lotes/
│   └── {lote_id}/
│       ├── foto_01.jpg
│       └── foto_02.jpg
└── recibos/
    └── {pago_id}/
        └── recibo.pdf
```

**Política de Acceso:** Los documentos son privados. Se generan URLs pre-firmadas con expiración de 1 hora para acceso temporal.

### 8.5 SendGrid (Email Transaccional)

**Templates de Email:**

| Template | Trigger | Destinatario |
|----------|---------|-------------|
| `nuevo_lead` | Lead asignado | Vendedor |
| `venta_confirmada` | Venta registrada | Cliente + Admin |
| `recordatorio_pago` | 7 días antes del vencimiento | Cliente |
| `pago_recibido` | Pago registrado | Cliente |
| `pago_vencido` | Día del vencimiento | Cliente + Vendedor |
| `comision_aprobada` | Comisión aprobada | Vendedor |
| `bienvenida_cliente` | Portal activado | Cliente |

---

## 9. API ENDPOINTS DOCUMENTADOS

### 9.1 Autenticación

```
POST   /api/auth/login          → Iniciar sesión, retorna JWT
POST   /api/auth/refresh        → Renovar token
POST   /api/auth/logout         → Cerrar sesión
POST   /api/auth/forgot-password → Solicitar reset
POST   /api/auth/reset-password  → Confirmar reset
```

### 9.2 Lotes

```
GET    /api/lotes               → Listar con filtros y paginación
GET    /api/lotes/:id           → Detalle completo de lote
POST   /api/lotes               → Crear lote [admin]
PUT    /api/lotes/:id           → Actualizar lote [admin]
PATCH  /api/lotes/:id/estado    → Cambiar estado [admin/vendedor]
DELETE /api/lotes/:id           → Eliminar lote [admin]
GET    /api/lotes/geojson       → GeoJSON de todos los lotes (para mapa)
GET    /api/lotes/stats         → Estadísticas de inventario
```

### 9.3 Leads

```
GET    /api/leads               → Listar leads [admin/gerente/vendedor-propio]
GET    /api/leads/:id           → Detalle de lead
POST   /api/leads               → Crear lead manual
PATCH  /api/leads/:id           → Actualizar estado/notas
PATCH  /api/leads/:id/assign    → Reasignar a vendedor [admin/gerente]
DELETE /api/leads/:id           → Eliminar lead [admin]
GET    /api/leads/stats         → Estadísticas de leads
POST   /api/leads/webhook       → Webhook de Meta Lead Ads [público]
GET    /api/leads/webhook       → Verificación de webhook Meta [público]
```

### 9.4 Ventas

```
GET    /api/ventas              → Listar ventas
GET    /api/ventas/:id          → Detalle de venta
POST   /api/ventas              → Registrar venta [vendedor/admin]
PATCH  /api/ventas/:id/estado   → Cambiar estado [admin]
DELETE /api/ventas/:id          → Cancelar venta [admin]
GET    /api/ventas/stats        → KPIs de ventas
POST   /api/ventas/:id/contrato → Subir contrato firmado
```

### 9.5 Pagos

```
GET    /api/pagos               → Listar pagos
GET    /api/pagos/:id           → Detalle de pago
POST   /api/pagos               → Registrar pago [vendedor/admin]
GET    /api/pagos/amortizacion/:venta_id → Tabla de amortización
GET    /api/pagos/vencidos      → Pagos vencidos (cartera vencida)
GET    /api/pagos/stats         → Estadísticas de pagos
```

### 9.6 Comisiones

```
GET    /api/comisiones          → Listar comisiones
GET    /api/comisiones/:id      → Detalle de comisión
PATCH  /api/comisiones/:id/aprobar → Aprobar comisión [admin/gerente]
PATCH  /api/comisiones/:id/pagar   → Marcar como pagada [admin]
GET    /api/comisiones/vendedor/:id → Comisiones por vendedor
GET    /api/comisiones/stats    → Estadísticas de comisiones
```

### 9.7 Dashboard / KPIs

```
GET    /api/dashboard/admin     → KPIs para administrador
GET    /api/dashboard/vendedor  → KPIs para vendedor específico
GET    /api/dashboard/gerente   → KPIs para gerente
GET    /api/reportes/ventas     → Reporte de ventas por período
GET    /api/reportes/cartera    → Reporte de cartera vencida
GET    /api/reportes/comisiones → Reporte de comisiones
```

---

## 10. SEGURIDAD Y AUTENTICACIÓN

### 10.1 Arquitectura de Seguridad

```
Request → Rate Limiter → CORS Check → Helmet Headers
    → JWT Validation → Role Authorization → Input Validation
    → Business Logic → Response Sanitization → Audit Log
```

### 10.2 Configuración de Seguridad

**Rate Limiting:**
- General: 100 requests / 15 minutos por IP
- Login: 5 intentos / 15 minutos por IP
- Webhook: Sin límite (verificado por firma HMAC)

**Headers de Seguridad (Helmet):**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: default-src 'self'`

**CORS:** Solo permite orígenes de `quintasdeotinapa.com` y `localhost:3000` en desarrollo.

---

## 11. ROLES Y PERMISOS

### 11.1 Matriz de Permisos

| Recurso | Admin | Gerente | Vendedor | Cliente |
|---------|-------|---------|---------|---------|
| Ver todos los lotes | ✅ | ✅ | ✅ | ✅ (solo disponibles) |
| Modificar lotes | ✅ | ❌ | ❌ | ❌ |
| Ver todos los leads | ✅ | ✅ (su equipo) | ✅ (propios) | ❌ |
| Crear leads | ✅ | ✅ | ✅ | ❌ |
| Reasignar leads | ✅ | ✅ | ❌ | ❌ |
| Ver todas las ventas | ✅ | ✅ (su equipo) | ✅ (propias) | ✅ (propias) |
| Crear ventas | ✅ | ✅ | ✅ | ❌ |
| Cancelar ventas | ✅ | ❌ | ❌ | ❌ |
| Ver pagos | ✅ | ✅ | ✅ (propios) | ✅ (propios) |
| Registrar pagos | ✅ | ✅ | ✅ | ❌ |
| Ver comisiones | ✅ | ✅ (su equipo) | ✅ (propias) | ❌ |
| Aprobar comisiones | ✅ | ✅ | ❌ | ❌ |
| Ver reportes | ✅ | ✅ (parcial) | ✅ (propios) | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ | ❌ |

---

## 12. KPIs Y MÉTRICAS DEL SISTEMA

### 12.1 KPIs del Dashboard Ejecutivo

```typescript
interface KPIsDashboard {
  // Inventario
  totalLotes: number;
  lotesDisponibles: number;
  lotesApartados: number;
  lotesVendidos: number;
  lotesLiquidados: number;
  porcentajeDisponibilidad: number;
  
  // Ventas
  ventasMes: number;
  ventasAño: number;
  ingresosMes: number;
  ingresosAño: number;
  ticketPromedio: number;
  
  // Leads
  leadsMes: number;
  tasaConversion: number;           // leads → ventas
  tiempoPromedioConversion: number; // días
  leadsPorVendedor: Record<string, number>;
  
  // Cartera
  carteraTotal: number;
  carteraVencida: number;
  porcentajeCarteraVencida: number;
  
  // Comisiones
  comisionesPendientes: number;
  comisionesAprobadas: number;
  comisionesPagadasMes: number;
}
```

### 12.2 KPIs del Dashboard de Vendedor

```typescript
interface KPIsVendedor {
  leadsAsignados: number;
  leadsContactados: number;
  leadsInteresados: number;
  ventasMes: number;
  metaMensual: number;
  porcentajeMeta: number;
  comisionesPendientes: number;
  comisionesAprobadas: number;
  rankingEquipo: number;
}
```

---

## 13. GLOSARIO PROPTECH

**Amortización:** Proceso de pago gradual de una deuda mediante cuotas periódicas que incluyen capital e intereses.

**Apartado:** Estado temporal de un lote que indica que un cliente ha mostrado intención de compra y se ha reservado por un período determinado.

**Cartera Vencida:** Conjunto de pagos que no fueron realizados en la fecha acordada. Indicador clave de salud financiera del portafolio.

**CRM (Customer Relationship Management):** Sistema para gestionar las relaciones con clientes y prospectos, incluyendo seguimiento de interacciones, ventas y comunicaciones.

**Enganche:** Pago inicial que realiza el comprador al momento de formalizar la compra, generalmente un porcentaje del precio total.

**GeoJSON:** Formato estándar para codificar estructuras de datos geográficos (puntos, líneas, polígonos) en JSON.

**Lead:** Prospecto o persona que ha mostrado interés en adquirir un lote, ya sea a través de publicidad, referido o contacto directo.

**Lead Ads:** Formato de anuncio de Facebook/Instagram que permite capturar datos de contacto directamente en la plataforma sin redirigir al usuario a un sitio web.

**Lote:** Terreno o parcela individual dentro de un fraccionamiento o desarrollo inmobiliario.

**Mora:** Cargo adicional aplicado cuando un pago no se realiza en la fecha acordada.

**PropTech:** Property Technology. Término que describe el uso de tecnología para innovar en el sector inmobiliario.

**Round-Robin:** Algoritmo de distribución equitativa que asigna tareas (en este caso, leads) de forma rotativa entre los miembros de un equipo.

**SKU (Stock Keeping Unit):** Código único de identificación para cada lote en el inventario.

**Webhook:** Mecanismo que permite a una aplicación enviar notificaciones automáticas a otra cuando ocurre un evento específico.

---

## 14. CHECKLIST GO-TO-PRODUCTION

### ✅ Los 10 Puntos Críticos Antes de Lanzar

**1. SSL/TLS y Dominio**
- [ ] Certificado SSL instalado y auto-renovable (Let's Encrypt o AWS ACM)
- [ ] Dominio apuntando correctamente (A record, CNAME)
- [ ] Redirección HTTP → HTTPS forzada
- [ ] HSTS habilitado en headers

**2. Base de Datos en Producción**
- [ ] MySQL en servidor dedicado (AWS RDS recomendado)
- [ ] Backups automáticos diarios configurados (retención 30 días)
- [ ] Backups semanales en S3 (retención 1 año)
- [ ] Contraseñas de DB diferentes a desarrollo
- [ ] Acceso restringido por IP (solo desde servidores de la app)
- [ ] Replicación read-replica configurada (para reportes)

**3. Variables de Entorno**
- [ ] NUNCA commitear `.env` al repositorio
- [ ] Usar AWS Secrets Manager o Vercel Environment Variables
- [ ] Rotar todas las claves de desarrollo antes de producción
- [ ] JWT_SECRET con mínimo 256 bits de entropía
- [ ] Verificar que NEXTAUTH_URL apunta al dominio de producción

**4. Autenticación y Autorización**
- [ ] Cambiar credenciales por defecto (admin@quintasdeotinapa.com / Admin123!)
- [ ] Implementar 2FA para cuentas de administrador
- [ ] Verificar que todos los endpoints protegidos requieren JWT válido
- [ ] Probar que los roles funcionan correctamente (vendedor no puede ver datos de otros)

**5. Rate Limiting y Protección DDoS**
- [ ] Rate limiting configurado en todos los endpoints
- [ ] Cloudflare o AWS WAF configurado
- [ ] Límites de tamaño de request (max 10MB para uploads)
- [ ] Protección contra SQL injection (usar ORM/prepared statements)
- [ ] Sanitización de inputs habilitada

**6. Monitoreo y Alertas**
- [ ] Uptime monitoring configurado (UptimeRobot o Pingdom)
- [ ] Alertas de error rate > 5% en 5 minutos
- [ ] Alertas de tiempo de respuesta > 3 segundos
- [ ] Logs centralizados (CloudWatch o Datadog)
- [ ] Dashboard de métricas en tiempo real

**7. Cumplimiento Legal (Ley de Protección de Datos - México)**
- [ ] Aviso de Privacidad publicado y accesible
- [ ] Consentimiento explícito para uso de datos personales
- [ ] Mecanismo para solicitar eliminación de datos (derecho ARCO)
- [ ] Datos sensibles encriptados en reposo (AES-256)
- [ ] Registro de actividades de tratamiento de datos
- [ ] Cumplimiento con LFPDPPP (Ley Federal de Protección de Datos Personales)

**8. Performance y Escalabilidad**
- [ ] Imágenes optimizadas (WebP, lazy loading)
- [ ] GeoJSON cacheado en Redis (TTL: 5 minutos)
- [ ] CDN configurado para assets estáticos
- [ ] Índices de base de datos verificados con EXPLAIN
- [ ] Load testing realizado (mínimo 100 usuarios concurrentes)

**9. Seguridad de Archivos y Documentos**
- [ ] Bucket S3 privado (sin acceso público)
- [ ] URLs pre-firmadas con expiración de 1 hora
- [ ] Validación de tipo de archivo en uploads (solo PDF, JPG, PNG)
- [ ] Límite de tamaño de archivo (max 10MB)
- [ ] Escaneo de malware en archivos subidos

**10. Plan de Recuperación ante Desastres**
- [ ] Procedimiento documentado de restauración de backup
- [ ] RTO (Recovery Time Objective): < 4 horas
- [ ] RPO (Recovery Point Objective): < 24 horas
- [ ] Contactos de emergencia documentados
- [ ] Prueba de restauración realizada exitosamente

---

## 15. PLAN DE ONBOARDING 4 SEMANAS

### Semana 1: Fundamentos y Configuración

**Objetivo:** El equipo de ventas conoce el sistema y puede navegar el mapa.

**Día 1-2: Presentación del Sistema**
- Sesión de 2 horas con todo el equipo de ventas
- Demostración del mapa interactivo
- Explicación del código de colores de lotes
- Preguntas y respuestas

**Día 3-4: Configuración de Accesos**
- Creación de usuarios para todos los vendedores
- Configuración de perfiles (zona asignada, datos de contacto)
- Instalación de la app en dispositivos móviles
- Verificación de acceso de cada vendedor

**Día 5: Práctica Guiada**
- Ejercicio: Buscar un lote específico en el mapa
- Ejercicio: Filtrar lotes por zona y precio
- Ejercicio: Ver el detalle de un lote
- Tarea: Cada vendedor debe encontrar 5 lotes disponibles en su zona

**Entregables de la Semana:**
- ✅ 100% de vendedores con acceso al sistema
- ✅ Manual de usuario impreso entregado
- ✅ Video tutorial grabado y compartido

---

### Semana 2: Gestión de Leads

**Objetivo:** El equipo puede gestionar leads desde Facebook y el sistema.

**Día 1-2: Flujo de Leads**
- Demostración de cómo llega un lead de Facebook
- Cómo ver y gestionar leads asignados
- Cómo actualizar el estado de un lead
- Cómo agregar notas y seguimientos

**Día 3: Integración con WhatsApp**
- Configuración de notificaciones en WhatsApp
- Práctica: Recibir notificación de lead de prueba
- Protocolo de respuesta en < 30 minutos

**Día 4-5: Simulacro de Lead**
- Ejercicio completo: Lead llega → Vendedor recibe notificación → Contacta → Actualiza estado
- Revisión de errores comunes
- Sesión de preguntas

**Entregables de la Semana:**
- ✅ Todos los vendedores reciben notificaciones de WhatsApp
- ✅ Protocolo de respuesta a leads documentado y firmado
- ✅ Primer lead real gestionado por cada vendedor

---

### Semana 3: Proceso de Venta

**Objetivo:** El equipo puede registrar ventas y calcular financiamiento.

**Día 1-2: Registro de Venta**
- Cómo registrar un cliente nuevo
- Cómo iniciar el proceso de apartado
- Cómo usar la calculadora de financiamiento
- Cómo generar y subir el contrato

**Día 3: Gestión de Pagos**
- Cómo registrar un pago
- Cómo ver la tabla de amortización
- Cómo generar un recibo
- Alertas de pagos vencidos

**Día 4: Comisiones**
- Cómo ver las comisiones pendientes
- Cómo solicitar pago de comisión
- Dashboard personal de rendimiento

**Día 5: Simulacro Completo**
- Ejercicio: Venta completa de principio a fin
- Desde lead → apartado → contrato → primer pago
- Revisión con el gerente

**Entregables de la Semana:**
- ✅ Cada vendedor ha registrado al menos 1 venta de prueba
- ✅ Proceso de venta documentado en video
- ✅ Checklist de venta impreso para cada vendedor

---

### Semana 4: Uso Total y Optimización

**Objetivo:** El equipo opera de forma autónoma y el sistema está en producción real.

**Día 1-2: Reportes y Dashboard**
- Cómo interpretar el dashboard de ventas
- Cómo generar reportes de cartera
- Cómo exportar datos a Excel
- KPIs que se monitorearán mensualmente

**Día 3: Administración (Solo para Admin/Gerente)**
- Gestión de usuarios y permisos
- Configuración de metas de ventas
- Gestión de comisiones
- Backups y seguridad básica

**Día 4: Resolución de Problemas**
- Preguntas frecuentes y soluciones
- Cómo reportar un bug o problema
- Contacto de soporte técnico
- Procedimiento de escalación

**Día 5: Go-Live y Celebración**
- Migración de datos históricos (si aplica)
- Activación del sistema en producción
- Primera semana de operación real con soporte activo
- Sesión de retroalimentación

**Entregables de la Semana:**
- ✅ Sistema en producción con datos reales
- ✅ Todos los lotes cargados en el mapa
- ✅ Todos los clientes existentes migrados
- ✅ Primer reporte semanal generado

---

### Métricas de Éxito del Onboarding

| Métrica | Objetivo Semana 1 | Objetivo Semana 4 |
|---------|------------------|------------------|
| Vendedores con acceso | 100% | 100% |
| Vendedores que usan el mapa diariamente | 50% | 90% |
| Leads gestionados en el sistema | 0% | 100% |
| Ventas registradas en el sistema | 0% | 100% |
| Satisfacción del equipo (1-10) | 7+ | 9+ |

---

## 16. MATRIZ DE PRIORIZACIÓN DE FEATURES (BACKLOG)

### 16.1 Framework de Priorización

Cada feature se evalúa en 4 dimensiones (1-5):
- **Impacto en Ventas:** ¿Cuánto aumenta las ventas?
- **Reducción de Fricción:** ¿Cuánto simplifica el proceso?
- **Diferenciación:** ¿Nos diferencia de la competencia?
- **Viabilidad Técnica:** ¿Qué tan fácil es implementar?

**Score = (Impacto × 2) + Fricción + Diferenciación + Viabilidad**

### 16.2 Backlog Priorizado

| # | Feature | Impacto | Fricción | Diferenciación | Viabilidad | Score | Prioridad |
|---|---------|---------|---------|---------------|-----------|-------|-----------|
| 1 | **Firma Digital de Contratos** | 5 | 5 | 4 | 3 | 22 | 🔴 CRÍTICA |
| 2 | **App Móvil Nativa (iOS/Android)** | 5 | 5 | 4 | 2 | 21 | 🔴 CRÍTICA |
| 3 | **Pasarela de Pagos (Stripe/Conekta)** | 5 | 4 | 4 | 3 | 21 | 🔴 CRÍTICA |
| 4 | **Chatbot de WhatsApp con IA** | 4 | 5 | 5 | 3 | 21 | 🔴 CRÍTICA |
| 5 | **Visualizador de Mapa 3D** | 3 | 3 | 5 | 3 | 17 | 🟡 ALTA |
| 6 | **Tours Virtuales 360°** | 4 | 3 | 5 | 2 | 18 | 🟡 ALTA |
| 7 | **Reportes Avanzados con BI** | 4 | 4 | 3 | 3 | 18 | 🟡 ALTA |
| 8 | **Multi-Proyecto (varios desarrollos)** | 5 | 3 | 3 | 2 | 18 | 🟡 ALTA |
| 9 | **Integración con Notarías** | 3 | 4 | 4 | 2 | 16 | 🟢 MEDIA |
| 10 | **Marketplace de Lotes** | 4 | 2 | 5 | 2 | 17 | 🟢 MEDIA |
| 11 | **Análisis Predictivo con IA** | 4 | 3 | 5 | 2 | 18 | 🟢 MEDIA |
| 12 | **Blockchain para Escrituras** | 3 | 2 | 5 | 1 | 14 | ⚪ BAJA |
| 13 | **Realidad Aumentada** | 2 | 2 | 5 | 1 | 12 | ⚪ BAJA |

### 16.3 Roadmap por Versión

**Versión 1.0 (Actual — MVP)**
- ✅ Mapa interactivo con polígonos
- ✅ CRM básico con Directus
- ✅ Gestión de ventas y pagos
- ✅ Sistema de comisiones
- ✅ Portal de clientes
- ✅ Integración Meta Lead Ads

**Versión 1.1 (Q2 2026 — 3 meses)**
- 🔴 Firma digital de contratos (DocuSign/Mifiel)
- 🔴 Pasarela de pagos (Conekta para México)
- 🟡 App móvil PWA (Progressive Web App)
- 🟡 Reportes avanzados con exportación

**Versión 1.2 (Q3 2026 — 6 meses)**
- 🔴 App móvil nativa (React Native)
- 🔴 Chatbot WhatsApp con IA (GPT-4)
- 🟡 Tours virtuales 360° integrados
- 🟡 Multi-proyecto (gestionar varios desarrollos)

**Versión 2.0 (Q1 2027 — 12 meses)**
- 🟢 Marketplace de lotes (B2C)
- 🟢 Análisis predictivo (scoring de leads con ML)
- 🟢 Integración con notarías digitales
- 🟢 Visualizador 3D del desarrollo

---

## 17. GUÍA DE CONFIGURACIÓN NOTEBOOKLM

### 17.1 ¿Qué es NotebookLM y por qué usarlo?

NotebookLM es una herramienta de Google que permite cargar documentos y generar contenido inteligente a partir de ellos, incluyendo **podcasts de audio**, resúmenes, preguntas frecuentes y guías de estudio. Para Quintas-CRM, es ideal para:

- Generar podcasts de entrenamiento para nuevos vendedores
- Crear guías de respuesta rápida para objeciones
- Producir material de capacitación sin necesidad de un instructor
- Mantener al equipo actualizado con cambios en el sistema

### 17.2 Paso a Paso: Configurar NotebookLM para Quintas-CRM

**Paso 1: Acceder a NotebookLM**
1. Ir a [notebooklm.google.com](https://notebooklm.google.com)
2. Iniciar sesión con cuenta de Google (preferiblemente corporativa)
3. Hacer click en "Nuevo Notebook"
4. Nombrar el notebook: "Quintas-CRM — Base de Conocimientos 2026"

**Paso 2: Cargar los Documentos**
1. Hacer click en "Agregar fuente"
2. Cargar los siguientes archivos en este orden:
   - `PROJECT_KNOWLEDGE_BASE.md` (este documento — PRINCIPAL)
   - `README.md` (descripción general del sistema)
   - `DOCUMENTACION_COMPLETA_PROYECTO.md` (documentación técnica)
   - `RESUMEN_EJECUTIVO.md` (métricas y arquitectura)
   - `SPEECH_VENTAS.md` (material de ventas)
3. Esperar a que NotebookLM procese todos los documentos (2-5 minutos)

**Paso 3: Generar el Podcast de Entrenamiento**

Para generar un podcast de entrenamiento para vendedores:

1. En el panel derecho, hacer click en "Audio Overview" (Resumen de Audio)
2. Hacer click en "Customize" para personalizar el contenido
3. En el campo de instrucciones, escribir:

```
Genera un podcast de entrenamiento de 15-20 minutos para nuevos vendedores 
de Quintas de Otinapa. El podcast debe cubrir:

1. Qué es Quintas-CRM y por qué es importante (2 min)
2. Cómo funciona el mapa interactivo (3 min)
3. El proceso de gestión de leads desde Facebook (3 min)
4. Cómo registrar una venta paso a paso (4 min)
5. Cómo ver y gestionar comisiones (2 min)
6. Los 5 errores más comunes y cómo evitarlos (3 min)

Usa un tono conversacional, amigable y motivador. 
Incluye ejemplos prácticos y situaciones reales.
```

4. Hacer click en "Generate" y esperar 3-5 minutos
5. El podcast estará disponible para escuchar y descargar

**Paso 4: Generar Material Adicional**

*Para generar FAQ de vendedores:*
```
Genera las 20 preguntas más frecuentes que haría un vendedor nuevo 
sobre el uso de Quintas-CRM, con respuestas claras y concisas.
Organízalas por categoría: Mapa, Leads, Ventas, Pagos, Comisiones.
```

*Para generar guía de objeciones:*
```
Basándote en el documento SPEECH_VENTAS.md, genera una guía de 
bolsillo con las 10 objeciones más comunes de clientes y las 
respuestas recomendadas. Formato: Objeción → Respuesta → Cierre.
```

*Para generar resumen ejecutivo para el owner:*
```
Genera un resumen ejecutivo de 1 página para el dueño de la 
inmobiliaria, destacando el ROI, los beneficios principales y 
los próximos pasos de implementación. Tono formal y persuasivo.
```

### 17.3 Prompts Avanzados para NotebookLM

**Prompt para Capacitación Técnica (Desarrolladores):**
```
Actúa como un senior developer explicando la arquitectura de Quintas-CRM 
a un desarrollador junior. Cubre: stack tecnológico, modelo de datos, 
flujo de autenticación, integración con Meta y las reglas de negocio 
más importantes. Incluye ejemplos de código cuando sea relevante.
```

**Prompt para Presentación al Inversionista:**
```
Genera un pitch de 5 minutos para presentar Quintas-CRM a un 
inversionista potencial. Enfócate en: tamaño del mercado PropTech 
en México, problema que resuelve, diferenciadores vs. competencia, 
métricas de tracción y proyección de crecimiento.
```

**Prompt para Manual de Administrador:**
```
Genera un manual de administrador del sistema que cubra: 
gestión de usuarios y permisos, configuración de comisiones, 
generación de reportes, procedimientos de backup y las 
10 tareas administrativas más comunes con instrucciones paso a paso.
```

### 17.4 Mantenimiento del Notebook

- **Actualizar mensualmente:** Agregar nuevas versiones de documentos cuando haya cambios significativos
- **Crear notebooks separados** para: Ventas, Técnico, Ejecutivo
- **Compartir el notebook** con el equipo de ventas para que puedan hacer preguntas directamente
- **Exportar los podcasts** y subirlos a una carpeta compartida de Google Drive para acceso offline

---

*Documento generado por SuperNinja AI | Quintas-CRM Knowledge Base v2.0 | 2026*
*Para actualizaciones o correcciones: dev@quintasdeotinapa.com*
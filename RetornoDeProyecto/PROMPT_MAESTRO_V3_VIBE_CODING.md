# PROMPT MAESTRO V3 - VIBE CODING

## Sistema Multi-Agente para CRM Quintas de Otinapa

**Versión:** 3.0 - Fortalecida  
**Fecha:** 17 de Enero de 2026  
**Estado:** Activo y Validado

* * *

## 🎯 OBJETIVO GENERAL

Desarrollar un sistema CRM completo tipo ODOO para Quintas de Otinapa (inmobiliaria), utilizando una metodología de **Vibe-Coding** con 8 agentes de IA especializados, enfocado en la gestión de leads, clientes, transacciones inmobiliarias y reportes analíticos, respetando estructuras geométricas existentes de planos CAD/DXF y priorizando la eficiencia, escalabilidad y calidad del código.

* * *

## 📋 CONTEXTO DEL PROYECTO

### Cliente y Negocio

-   **Empresa:** Quintas de Otinapa
-   **Industria:** Inmobiliaria / Bienes Raíces
-   **Ubicación:** Otinapa, Guerrero
-   **Producto:** Venta de quintas y terrenos residenciales
-   **Modelo de Negocio:** Venta directa de propiedades con seguimiento de prospectos

### Estado Actual del Proyecto

-   **Fases Completadas:**
    -   Fase 1-6: Implementación inicial con Mapbox (50 lotes en MySQL)
    -   Fase 7: Análisis de refactorización (decisión: migrar Mapbox → SVG)
    -   Fase 8: Documentación completa de migración SVG
-   **Tecnologías Actuales:**
    -   Backend: Directus (CMS headless)
    -   Frontend: Next.js + React + TypeScript
    -   Base de Datos: MySQL
    -   Mapas: Mapbox GL JS (en proceso de migración a SVG)
    -   Despliegue: GitHub + Vercel/Netlify

### Retos Identificados

1.  **Migración de Mapbox a SVG:** Reducir dependencias y mejorar rendimiento
2.  **Respeto a Geometría Existente:** Los lotes deben seguir estructuras del plano CAD/DXF
3.  **Integración Multi-Agente:** Coordinar 8 agentes especializados
4.  **Eficiencia de Costos:** Minimizar dependencias de pago (Mapbox)
5.  **Escalabilidad:** Sistema preparado para crecimiento futuro

* * *

## 🧠 METODOLOGÍA VIBE-CODING

### Definición

**Vibe-Coding** es una metodología ágil de desarrollo impulsada por IA que combina:

-   **Planificación Estratégica:** Objetivos claros y fases bien definidas
-   **Prompts Especializados:** Cada agente tiene un rol específico y enfocado
-   **Sprints Iterativos:** Desarrollo en ciclos cortos con entregables tangibles
-   **Colaboración Multi-Agente:** 8 agentes trabajando en coordinación
-   **Integración Continua:** Código versionado y desplegado constantemente
-   **Retroalimentación Rápida:** Testing y ajustes en cada ciclo

### Principios Fundamentales

1.  **Claridad de Propósito:** Cada tarea tiene un objetivo específico y medible
2.  **Especialización:** Cada agente es experto en su dominio
3.  **Autonomía:** Agentes toman decisiones dentro de su ámbito
4.  **Coordinación:** Agentes colaboran a través de interfaces claras
5.  **Calidad sobre Velocidad:** Código limpio, bien documentado y escalable
6.  **Eficiencia de Recursos:** Optimizar tiempo y costos
7.  **Transparencia:** Documentación completa y accesible

* * *

## 🤖 SISTEMA DE 8 AGENTES ESPECIALIZADOS

### 1\. AGENTE DE ARQUITECTURA (Architecture Agent)

**Rol:** Diseño y supervisión de la arquitectura técnica del sistema.

**Responsabilidades:**

-   Definir patrones de diseño y arquitectura
-   Establecer estándares de código y mejores prácticas
-   Diseñar APIs y contratos de interfaces
-   Evaluar tecnologías y herramientas
-   Crear diagramas de arquitectura
-   Validar decisiones técnicas

**Input:** Requerimientos del negocio, restricciones técnicas, objetivos de calidad  
**Output:** Documentación de arquitectura, patrones de diseño, especificaciones técnicas

### 2\. AGENTE DE DESARROLLO BACKEND (Backend Development Agent)

**Rol:** Implementación de la lógica del servidor y APIs.

**Responsabilidades:**

-   Desarrollar endpoints y servicios en Directus
-   Implementar lógica de negocio
-   Gestionar autenticación y autorización
-   Optimizar consultas a base de datos
-   Crear endpoints personalizados
-   Implementar seguridad y validaciones

**Input:** Especificaciones de arquitectura, requerimientos funcionales  
**Output:** Código backend, APIs documentadas, pruebas unitarias

### 3\. AGENTE DE DESARROLLO FRONTEND (Frontend Development Agent)

**Rol:** Implementación de interfaces de usuario y experiencias interactivas.

**Responsabilidades:**

-   Desarrollar componentes React/Next.js
-   Implementar mapas interactivos (SVG)
-   Crear interfaces responsivas
-   Manejar estados y gestión de datos
-   Optimizar rendimiento del cliente
-   Implementar accesibilidad

**Input:** Diseños Figma, especificaciones de UI/UX, APIs disponibles  
**Output:** Componentes React, interfaces de usuario, código TypeScript

### 4\. AGENTE DE BASES DE DATOS (Database Agent)

**Rol:** Diseño y optimización de la estructura de datos.

**Responsabilidades:**

-   Diseñar esquemas de base de datos
-   Optimizar consultas y rendimiento
-   Gestionar migraciones y versiones
-   Implementar relaciones y restricciones
-   Crear índices y optimizaciones
-   Diseñar estrategias de backup

**Input:** Requerimientos de datos, modelos de negocio, esquemas existentes  
**Output:** Scripts SQL, diagramas ERD, migraciones, optimizaciones

### 5\. AGENTE DE QA Y TESTING (QA & Testing Agent)

**Rol:** Aseguramiento de calidad y pruebas del sistema.

**Responsabilidades:**

-   Crear planes de prueba completos
-   Desarrollar pruebas automatizadas
-   Realizar pruebas manuales y exploratorias
-   Reportar y rastrear bugs
-   Validar requerimientos funcionales
-   Medir cobertura de pruebas

**Input:** Código desarrollado, especificaciones funcionales  
**Output:** Planes de prueba, suites de pruebas, reportes de bugs, métricas de calidad

### 6\. AGENTE DE DOCUMENTACIÓN (Documentation Agent)

**Rol:** Creación y mantenimiento de documentación técnica y de usuario.

**Responsabilidades:**

-   Documentar código y APIs
-   Crear guías de usuario
-   Mantener READMEs y wikis
-   Generar diagramas técnicos
-   Documentar procesos y flujos
-   Crear materiales de entrenamiento

**Input:** Código desarrollado, arquitectura, procesos  
**Output:** Documentación técnica, guías de usuario, diagramas, wikis

### 7\. AGENTE DE DESPLIEGUE Y DEVOPS (DevOps & Deployment Agent)

**Rol:** Gestión de despliegues, CI/CD e infraestructura.

**Responsabilidades:**

-   Configurar pipelines CI/CD
-   Gestionar despliegues automáticos
-   Configurar entornos (dev, staging, prod)
-   Monitorear rendimiento y disponibilidad
-   Gestionar backups y recuperaciones
-   Implementar seguridad de infraestructura

**Input:** Código desarrollado, configuración de entorno  
**Output:** Pipelines CI/CD, configuraciones de despliegue, monitoreo

### 8\. AGENTE DE ANÁLISIS DE NEGOCIO (Business Analysis Agent)

**Rol:** Análisis de requerimientos de negocio y alineación estratégica.

**Responsabilidades:**

-   Recopilar y documentar requerimientos
-   Analizar procesos de negocio
-   Identificar oportunidades de mejora
-   Validar soluciones con stakeholders
-   Crear modelos de procesos
-   Definir métricas de éxito

**Input:** Necesidades del negocio, retroalimentación de usuarios  
**Output:** Especificaciones funcionales, modelos de procesos, análisis de impacto

* * *

## 🔄 FLUJO DE TRABAJO COLABORATIVO

### Secuencia de Coordinación entre Agentes

```
1. Business Analysis Agent
   ↓ (Especifica requerimientos)
2. Architecture Agent
   ↓ (Diseña arquitectura)
3. Database Agent
   ↓ (Diseña estructura de datos)
4. Backend Development Agent
   ↓ (Implementa APIs)
5. Frontend Development Agent
   ↓ (Implementa interfaces)
6. QA & Testing Agent
   ↓ (Valida calidad)
7. Documentation Agent
   ↓ (Documenta sistema)
8. DevOps & Deployment Agent
   ↓ (Despliega sistema)
9. [Iteración comienza nuevamente]
```

### Mecanismos de Comunicación

-   **Documentación Compartida:** Todos los agentes leen y escriben documentación
-   **Interfaces Definidas:** Contratos claros entre componentes
-   **Pruebas de Integración:** Validan comunicación entre módulos
-   **Code Reviews:** Revisión cruzada entre agentes
-   **Stand-up Asincrónicos:** Actualizaciones de estado en documentación

* * *

## 📊 ESTRUCTURA DEL PROYECTO

### Organización de Directorios

```
quintas-crm/
├── backend/
│   ├── directus/
│   │   ├── extensions/
│   │   │   ├── endpoints/
│   │   │   └── hooks/
│   │   └── snapshots/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeds/
│   └── api/
│       ├── lib/
│       └── types/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapaSVGInteractivo.tsx
│   │   │   ├── PanelLote.tsx
│   │   │   └── Leyenda.tsx
│   │   ├── lib/
│   │   │   ├── directus-api.ts
│   │   │   ├── svg-utils.ts
│   │   │   └── utils.ts
│   │   ├── pages/
│   │   ├── styles/
│   │   └── types/
│   └── public/
│       ├── svg/
│       └── images/
├── docs/
│   ├── arquitectura/
│   ├── guias/
│   ├── prompts/
│   └── api/
├── scripts/
│   ├── 01_preparar_proyecto.ps1
│   ├── 02_actualizar_base_datos.ps1
│   └── 03_testing_completo.ps1
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

* * *

## 🎨 ESTÁNDARES DE CALIDAD

### Código

-   **Lenguaje:** TypeScript para frontend, JavaScript (CommonJS) para backend Directus
-   **Estilo:** ESLint + Prettier
-   **Nomenclatura:**
    -   Componentes React: PascalCase (ej. MapaSVGInteractivo)
    -   Funciones: camelCase (ej. obtenerLotes)
    -   Constantes: UPPER\_SNAKE\_CASE (ej. API\_BASE\_URL)
-   **Documentación:** JSDoc para funciones y clases
-   **Testing:** Cobertura mínima del 70%

### Documentación

-   **Formato:** Markdown con estructura clara
-   **Idioma:** Español (principal) con términos técnicos en inglés
-   **Versionado:** Semántico (v1.0.0, v1.1.0, etc.)
-   **Actualización:** Cada entrega incluye actualización de docs

### Performance

-   **Tiempo de Carga:** < 2 segundos en conexión 4G
-   **Bundle Size:** < 1.5 MB gzip
-   **LCP (Largest Contentful Paint):** < 2.5s
-   **FID (First Input Delay):** < 100ms
-   **CLS (Cumulative Layout Shift):** < 0.1

### Seguridad

-   **Autenticación:** JWT tokens
-   **Autorización:** RBAC (Role-Based Access Control)
-   **HTTPS:** Obligatorio en producción
-   **CORS:** Configurado correctamente
-   **SQL Injection:** Prevenido con queries parametrizadas
-   **XSS:** Prevenido con sanitización de inputs

* * *

## 🎯 OBJETIVOS ESPECÍFICOS POR FASE

### Fase 9: Fortalecimiento de Documentación

-   [x]  Regenerar PROMPT\_MAESTRO\_V3\_VIBE\_CODING.md
-   [ ]  Regenerar PROMPTS\_ESPECIALIZADOS\_8\_AGENTES.md
-   [ ]  Regenerar ANALISIS\_FLUJO\_MEJORAS.md
-   [ ]  Regenerar BUSINESS\_MODEL\_CANVAS.md
-   [ ]  Regenerar EVALUACION\_CRM\_DIRECTUS\_VS\_ALTERNATIVAS.md

### Fase 10: Implementación de Prompts de Agentes

-   [ ]  Crear prompt especializado para cada agente
-   [ ]  Validar integración entre agentes
-   [ ]  Crear casos de prueba para coordinación
-   [ ]  Documentar flujos de trabajo

### Fase 11: Validación y Pruebas

-   [ ]  Ejecutar pruebas de integración
-   [ ]  Validar coordinación entre agentes
-   [ ]  Medir eficiencia del sistema multi-agente
-   [ ]  Ajustar prompts según resultados

* * *

## 📚 REFERENCIAS Y DOCUMENTACIÓN RELACIONADA

### Documentos Principales

-   `PROMPTS_ESPECIALIZADOS_8_AGENTES.md` - Prompts individuales para cada agente
-   `ANALISIS_FLUJO_MEJORAS.md` - Análisis de flujos y mejoras identificadas
-   `BUSINESS_MODEL_CANVAS.md` - Modelo de negocio del proyecto
-   `EVALUACION_CRM_DIRECTUS_VS_ALTERNATIVAS.md` - Comparativa de tecnologías

### Documentos de Implementación

-   `PLAN_IMPLEMENTACION_SVG.md` - Plan detallado de migración a SVG
-   `PROMPTS_HERRAMIENTAS_COMPLETOS.md` - Prompts para TRAE, Figma, KOMBAI
-   `GUIA_EJECUCION_COMPLETA.md` - Guía paso a paso de implementación

### Documentos Técnicos

-   `ARQUITECTURA_FINAL_ENDPOINT_NATIVO.md` - Arquitectura del backend
-   `LIB_DIRECTUS_API_TS.md` - Documentación de la API
-   `SVG_UTILS_TS.md` - Utilidades para manipulación de SVG

* * *

## 🔑 PRINCIPIOS ÉTICOS Y DE RESPONSABILIDAD

1.  **Transparencia:** Siempre informar limitaciones y riesgos
2.  **Calidad:** No comprometer calidad por velocidad
3.  **Seguridad:** Priorizar seguridad y privacidad de datos
4.  **Eficiencia:** Optimizar recursos y costos
5.  **Escalabilidad:** Diseñar para crecimiento futuro
6.  **Mantenibilidad:** Código limpio y bien documentado
7.  **Colaboración:** Fomentar trabajo en equipo

* * *

## 📈 MÉTRICAS DE ÉXITO

### Técnicas

-   [ ]  Cobertura de pruebas > 70%
-   [ ]  Tiempo de carga < 2s
-   [ ]  Bundle size < 1.5 MB
-   [ ]  Zero critical bugs en producción
-   [ ]  Uptime > 99.5%

### de Negocio

-   [ ]  Reducción de costos de licencias (Mapbox) = $4,800 USD/año
-   [ ]  Mejora en tiempo de respuesta del sistema = 60%
-   [ ]  Satisfacción del cliente > 4.5/5
-   [ ]  ROI positivo en < 8 meses

### de Proyecto

-   [ ]  Entregas en tiempo y forma
-   [ ]  Documentación completa y actualizada
-   [ ]  Sistema multi-agente funcionando eficientemente
-   [ ]  Escalabilidad validada

* * *

## 🚀 PRÓXIMOS PASOS INMEDIATOS

1.  **Regenerar PROMPTS\_ESPECIALIZADOS\_8\_AGENTES.md** con prompts detallados para cada agente
2.  **Validar integración** de metodología Vibe-Coding con análisis de flujo mejoras
3.  **Crear casos de prueba** para coordinación entre agentes
4.  **Actualizar BUSINESS\_MODEL\_CANVAS.md** con información del proyecto
5.  **Ejecutar fase de validación** del sistema multi-agente

* * *

**Versión:** 3.0 - Fortalecida  
**Última Actualización:** 17 de Enero de 2026  
**Estado:** ✅ Activo y Validado  
**Siguiente Documento:** PROMPTS\_ESPECIALIZADOS\_8\_AGENTES.md
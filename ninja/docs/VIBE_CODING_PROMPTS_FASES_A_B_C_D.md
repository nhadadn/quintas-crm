# VIBE-CODING PROMPTS — QUINTAS CRM
## Fases A, B, C y D — Prompts Estandarizados para trae.ai

> **Stack:** Next.js 15 · TypeScript · Tailwind CSS · Directus 10 · NextAuth v5 · Recharts · Zustand  
> **Repositorio:** `nhadadn/quintas-crm` · Rama: `main` · Versión: `0.4.0`  
> **Metodología:** Vibe-Coding — sprints cortos, entregables medibles, calidad sobre velocidad

---

# ═══════════════════════════════════════
# FASE A — DESIGN TOKENS & APP SHELL
# ═══════════════════════════════════════

---

## Fase A - Tarea 1: Migración de Variables CSS a Paleta "Quintas"

---

### 1. Contexto del Proyecto
Proyecto CRM inmobiliario Next.js 15 + Tailwind CSS + Directus 10. El archivo `frontend/app/globals.css` usa la paleta genérica de shadcn/ui (azul-gris). El `tailwind.config.ts` ya define colores "Quintas" (terracota, dorado, verde oliva) pero las variables CSS `--primary`, `--background`, `--card`, etc. no están alineadas con esa paleta. El resultado es una interfaz visualmente inconsistente.

### 2. Objetivo de la Tarea
Reemplazar las variables CSS HSL en `globals.css` con la paleta "Quintas" (light-only): verde pino `hsl(158 25% 22%)`, dorado `hsl(43 86% 55%)`, marrón corteza `hsl(26 30% 33%)`, superficie marfil `hsl(40 40% 97%)`. Eliminar el bloque `.dark {}` completo. Sincronizar `tailwind.config.ts` para que todos los tokens semánticos (`primary`, `secondary`, `accent`, `muted`, `card`, `border`) apunten a las nuevas variables CSS.

### 3. Fase del Roadmap y Dependencias
- **Fase:** A · **Posición:** 1/2 en Fase A · **Sprint:** 1
- **Dependencias previas completadas:** Ninguna (es la tarea fundacional)
- **Dependencias necesarias pendientes:** Ninguna
- **Siguiente paso lógico:** Tarea A-2 (Actualizar App Shell con nuevos tokens)

### 4. Instrucciones para el Agente
Analiza los archivos `frontend/app/globals.css` y `frontend/tailwind.config.ts`. Proporciona:

**a) Plan de migración de variables CSS** — lista ordenada de cada variable a cambiar con su valor actual y el valor propuesto en formato `--nombre: H S% L%;`. Incluye: `--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--border`, `--input`, `--ring`, `--destructive`, `--destructive-foreground`, `--radius`. Añade variables nuevas para estados semánticos: `--status-disponible`, `--status-apartado`, `--status-vendido`, `--status-liquidado`.

**b) Estrategia de sincronización con tailwind.config.ts** — describe qué entradas del objeto `colors` deben cambiar de valores HEX hardcodeados a `hsl(var(--nombre))` para mantener un único source of truth.

**c) Plan para eliminar el bloque `.dark {}`** — identifica qué componentes usan clases `dark:` y proporciona la lista de archivos afectados que requerirán revisión posterior.

**d) Archivo `frontend/lib/tokens.ts`** — estructura propuesta como constantes TypeScript para uso programático en Recharts y animaciones (no generar el archivo completo, solo la interfaz y 3 ejemplos de uso).

**e) Riesgos identificados** — lista de al menos 3 riesgos de la migración con su mitigación propuesta.

### 5. Restricciones
- NO generar el archivo `globals.css` completo ni el `tailwind.config.ts` completo
- NO modificar lógica de componentes; solo variables de diseño
- NO proponer modo oscuro; el sistema es light-only
- Respetar la nomenclatura existente de variables CSS (prefijo `--`)
- Mantener `--radius: 0.5rem` sin cambios
- Los valores HEX en `tailwind.config.ts` para `primary`, `secondary`, `status.*` pueden coexistir temporalmente como fallback

### 6. Formato de Entrega
- Tabla de migración: `Variable | Valor Actual | Valor Propuesto | Componentes Afectados`
- Lista de archivos con clases `dark:` a revisar
- Interfaz TypeScript para `tokens.ts` (solo estructura, sin implementación completa)
- Lista de riesgos con mitigación
- Estimación de impacto: número de archivos afectados por la migración

### 7. Autoauditoría
- [ ] ¿Cumple todos los requerimientos solicitados? (tabla de migración + estrategia tailwind + lista dark: + tokens.ts + riesgos)
- [ ] ¿Está alineado con el sprint 1 del roadmap?
- [ ] ¿Todas las dependencias previas están resueltas? (ninguna requerida)
- [ ] ¿Mantiene coherencia con el estado actual del roadmap? (no propone modo oscuro, no modifica lógica)

---

## Fase A - Tarea 2: Actualizar App Shell con Tokens "Quintas"

---

### 1. Contexto del Proyecto
Proyecto CRM inmobiliario Next.js 15. Tras completar A-1 (migración de variables CSS), los tokens HSL están definidos pero los layouts maestros siguen usando clases hardcodeadas de la paleta slate: `bg-slate-950`, `bg-slate-900`, `border-slate-800`, `text-slate-400`, `bg-emerald-500/10`, `text-emerald-400`. Estos archivos son: `app/layout.tsx`, `app/dashboard/layout.tsx`, `components/layout/Navbar.tsx`.

### 2. Objetivo de la Tarea
Actualizar los tres archivos del App Shell para que usen exclusivamente tokens semánticos de Tailwind (`bg-background`, `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `bg-primary/10`, `text-primary`) en lugar de clases hardcodeadas de la paleta slate/emerald. Añadir carga de fuentes tipográficas duales: serif para branding (ej. Playfair Display) y sans para UI (ej. Inter), registradas en `app/layout.tsx`.

### 3. Fase del Roadmap y Dependencias
- **Fase:** A · **Posición:** 2/2 en Fase A · **Sprint:** 1
- **Dependencias previas completadas:** A-1 (variables CSS migradas a paleta Quintas)
- **Dependencias necesarias pendientes:** Ninguna
- **Siguiente paso lógico:** Fase B-1 (Wizard de Venta — extensión a 6 pasos)

### 4. Instrucciones para el Agente
Analiza los archivos `app/layout.tsx`, `app/dashboard/layout.tsx` y `components/layout/Navbar.tsx`. Proporciona:

**a) Mapa de sustitución de clases** — tabla con cada clase hardcodeada encontrada, su reemplazo semántico propuesto y el archivo donde aparece. Formato: `Archivo | Clase Actual | Clase Semántica | Justificación`.

**b) Plan de carga de fuentes** — describe cómo integrar `next/font/google` en `app/layout.tsx` para las dos familias tipográficas. Incluye: nombre de las fuentes propuestas, subsets, variable CSS a registrar (`--font-serif`, `--font-sans`), y cómo aplicarlas en el `<body>` y en `tailwind.config.ts`.

**c) Actualización del estado activo en Navbar** — el estado activo actual usa `text-emerald-400`. Propone el reemplazo semántico y describe cómo el indicador activo debe verse con la nueva paleta (color, peso, indicador visual).

**d) Actualización del estado activo en Dashboard Sidebar** — actualmente `bg-emerald-500/10 text-emerald-400`. Propone el reemplazo con tokens semánticos y describe el estilo visual resultante.

**e) Verificación de contraste WCAG AA** — para cada par de colores texto/fondo propuesto, indica el ratio de contraste estimado y si cumple WCAG AA (mínimo 4.5:1 para texto normal, 3:1 para texto grande).

### 5. Restricciones
- NO generar los archivos completos; solo el mapa de sustitución y el plan
- NO cambiar la estructura HTML/JSX de los componentes; solo las clases CSS
- NO añadir nuevas dependencias de npm; usar `next/font/google` ya disponible
- Mantener `sticky top-0 z-50` y `backdrop-blur-md` en Navbar sin cambios
- El sidebar de `/dashboard` debe mantener `hidden md:block` (el drawer móvil es Fase E)
- Respetar la terminología del proyecto: "tarea", "sprint", "roadmap"

### 6. Formato de Entrega
- Tabla de sustitución de clases (Archivo | Clase Actual | Clase Semántica | Justificación)
- Bloque de configuración de fuentes para `app/layout.tsx` (solo la sección relevante, no el archivo completo)
- Tabla de verificación de contraste WCAG AA
- Lista de archivos adicionales que podrían necesitar actualización de clases slate/emerald (para sprints futuros)

### 7. Autoauditoría
- [ ] ¿Cumple todos los requerimientos? (mapa clases + fuentes + activo navbar + activo sidebar + contraste)
- [ ] ¿Está alineado con el sprint 1 y depende de A-1 completada?
- [ ] ¿Todas las dependencias previas están resueltas? (A-1 debe estar completa)
- [ ] ¿Mantiene coherencia con el roadmap? (no implementa drawer móvil, no cambia estructura JSX)

---

# ═══════════════════════════════════════
# FASE B — WIZARD DE VENTA (6 PASOS)
# ═══════════════════════════════════════

---

## Fase B - Tarea 1: Arquitectura del Wizard Extendido (Pasos 5 y 6)

---

### 1. Contexto del Proyecto
Proyecto CRM inmobiliario Next.js 15. El Wizard de Venta (`components/wizard/WizardVenta.tsx`) tiene 4 pasos implementados: Selección de Lote → Datos del Cliente → Términos de Venta → Confirmación. El estado se persiste en `localStorage` con la clave `wizard_venta_state`. El tipo `WizardState` en `components/wizard/types.ts` tiene: `currentStep`, `loteSeleccionado`, `cliente`, `terminos`. La función `handleFinish` en el paso 4 ya crea la venta en Directus y limpia el estado.

### 2. Objetivo de la Tarea
Diseñar la arquitectura para extender el Wizard a 6 pasos añadiendo: Paso 5 (Documentos y Firma) y Paso 6 (Confirmación Final con Recibo PDF). Actualizar `WizardState` y `types.ts`. Rediseñar la barra de progreso para 6 pasos con labels. Implementar modal de recuperación de sesión ("¿Continuar venta anterior?"). Mover la lógica de `handleFinish` del Paso 4 al Paso 6.

### 3. Fase del Roadmap y Dependencias
- **Fase:** B · **Posición:** 1/3 en Fase B · **Sprint:** 2
- **Dependencias previas completadas:** A-1 y A-2 (Design Tokens aplicados)
- **Dependencias necesarias pendientes:** Ninguna
- **Siguiente paso lógico:** B-2 (Implementar Step5Documentos), B-3 (Implementar Step6Confirmacion)

### 4. Instrucciones para el Agente
Analiza `components/wizard/WizardVenta.tsx`, `components/wizard/types.ts` y los 4 Steps existentes. Proporciona:

**a) Extensión de tipos** — propone la interfaz `WizardState` actualizada con los nuevos campos para pasos 5 y 6. Incluye: tipo `DocumentosVenta` con los campos necesarios (lista de documentos, estado de cada uno, firma digital). Propone el `INITIAL_STATE` actualizado.

**b) Arquitectura de la barra de progreso** — diseña el array `WIZARD_STEPS` con 6 elementos (id, label, icon de lucide-react, descripción corta). Describe el comportamiento visual: paso completado (checkmark), paso activo (resaltado con token `primary`), paso pendiente (muted). Propone si usar un componente separado `WizardProgressBar.tsx`.

**c) Lógica de recuperación de sesión** — describe el flujo del modal "¿Continuar venta anterior?": cuándo mostrarlo (al montar el componente si hay estado guardado con `currentStep > 1`), qué opciones ofrece (Continuar / Empezar nueva), y cómo limpiar el estado en cada caso.

**d) Redistribución de responsabilidades** — el `handleFinish` actual en el Paso 4 debe moverse al Paso 6. Describe qué hace el nuevo Paso 4 (solo revisión/confirmación sin crear la venta) y qué hace el Paso 6 (crear venta + generar PDF + limpiar estado).

**e) Validación por paso con Zod** — propone un schema Zod para cada uno de los 6 pasos. Solo la estructura del schema, no la implementación completa.

### 5. Restricciones
- NO generar los archivos `Step5Documentos.tsx` ni `Step6Confirmacion.tsx` completos
- NO modificar los Steps 1-3 existentes; solo el Step4 y el WizardVenta.tsx orquestador
- NO añadir dependencias de firma digital externas; usar canvas HTML5 nativo
- Mantener la compatibilidad con el `localStorage` existente (misma clave `wizard_venta_state`)
- El upload de documentos debe usar la API de Directus Files (`/files`) ya configurada
- Respetar el patrón existente: cada Step recibe `onNext`, `onBack`, `initialData`

### 6. Formato de Entrega
- Interfaz TypeScript actualizada para `WizardState` y `DocumentosVenta`
- Array `WIZARD_STEPS` con los 6 pasos definidos
- Diagrama de flujo textual del modal de recuperación de sesión
- Tabla de redistribución de responsabilidades por paso (Paso | Responsabilidad | Acción al completar)
- Schemas Zod propuestos (solo estructura, sin implementación)
- Lista de riesgos de la extensión con mitigación

### 7. Autoauditoría
- [ ] ¿Cumple todos los requerimientos? (tipos + barra progreso + recuperación sesión + redistribución + Zod)
- [ ] ¿Está alineado con el sprint 2?
- [ ] ¿Todas las dependencias previas están resueltas? (A-1 y A-2 completadas)
- [ ] ¿Mantiene coherencia con el roadmap? (no implementa Steps completos, no rompe Steps 1-3)

---

## Fase B - Tarea 2: Step 5 — Documentos y Firma Digital

---

### 1. Contexto del Proyecto
Proyecto CRM inmobiliario Next.js 15 + Directus 10. El Wizard de Venta está siendo extendido a 6 pasos (B-1 completada). Directus ya tiene configurada la API de archivos (`/files`). El cliente `directusClient` en `lib/directus-api.ts` está disponible. Los documentos requeridos para una venta inmobiliaria en México son: INE/IFE, comprobante de domicilio, RFC/CURP, y contrato firmado.

### 2. Objetivo de la Tarea
Diseñar el componente `Step5Documentos.tsx` para upload de documentos requeridos y captura de firma digital. El paso debe: mostrar checklist de documentos requeridos con estado (pendiente/subido/error), permitir upload de archivos a Directus, capturar firma digital en canvas HTML5, y no permitir avanzar al Paso 6 sin los documentos mínimos obligatorios.

### 3. Fase del Roadmap y Dependencias
- **Fase:** B · **Posición:** 2/3 en Fase B · **Sprint:** 2
- **Dependencias previas completadas:** B-1 (arquitectura del Wizard extendido definida)
- **Dependencias necesarias pendientes:** Ninguna
- **Siguiente paso lógico:** B-3 (Step 6 — Confirmación Final con Recibo PDF)

### 4. Instrucciones para el Agente
Proporciona el diseño detallado del componente `Step5Documentos.tsx`:

**a) Interfaz de props** — define `Step5Props` con todos los campos necesarios: `onNext`, `onBack`, `initialDocumentos`, `ventaId` (para asociar archivos), `token`.

**b) Lista de documentos requeridos** — define el array `DOCUMENTOS_REQUERIDOS` con: id, label, descripción, obligatorio (boolean), tipos de archivo aceptados (MIME types), tamaño máximo. Distingue entre obligatorios (INE, comprobante domicilio) y opcionales (RFC, carta de ingresos).

**c) Lógica de upload a Directus** — describe el flujo de `uploadDocumento(file, tipo, token)`: construcción del `FormData`, endpoint `/files`, manejo de progreso, manejo de errores (tamaño, tipo, red), y cómo almacenar el `fileId` retornado en el estado del Wizard.

**d) Componente de firma digital** — describe la implementación del canvas HTML5 para firma: eventos de mouse/touch, botón "Limpiar firma", conversión a base64 para almacenamiento, y validación de que la firma no está vacía.

**e) Lógica de validación del paso** — describe cuándo se habilita el botón "Continuar": todos los documentos obligatorios subidos Y firma capturada. Propone el estado de UI para cada documento (idle, uploading, success, error).

### 5. Restricciones
- NO generar el componente completo; solo la estructura, interfaces y lógica descrita
- NO usar librerías externas de firma digital; solo canvas HTML5 nativo
- NO bloquear el UI durante el upload; usar estados de carga por documento individual
- El upload debe ser a Directus `/files`, no a un storage externo
- Mantener el patrón de props de los Steps existentes (`onNext`, `onBack`, `initialData`)
- Los documentos opcionales no deben bloquear el avance

### 6. Formato de Entrega
- Interfaz `Step5Props` y tipo `DocumentoEstado`
- Array `DOCUMENTOS_REQUERIDOS` con los 4 tipos de documento
- Pseudocódigo de `uploadDocumento()` con manejo de errores
- Descripción del canvas de firma con eventos y métodos
- Máquina de estados para el botón "Continuar" (condiciones de habilitación)
- Riesgos de UX identificados (ej: usuario en móvil con archivos grandes)

### 7. Autoauditoría
- [ ] ¿Cumple todos los requerimientos? (props + documentos + upload + firma + validación)
- [ ] ¿Está alineado con el sprint 2 y depende de B-1?
- [ ] ¿Todas las dependencias previas están resueltas? (B-1 arquitectura definida)
- [ ] ¿Mantiene coherencia con el roadmap? (no usa librerías externas, no genera componente completo)

---

## Fase B - Tarea 3: Step 6 — Confirmación Final y Recibo PDF

---

### 1. Contexto del Proyecto
Proyecto CRM inmobiliario Next.js 15. El Wizard de Venta llega al Paso 6 con todos los datos: lote seleccionado, cliente, términos de venta, y documentos subidos. Las dependencias `jspdf` y `jspdf-autotable` ya están instaladas en `package.json`. La función `createVenta()` en `lib/ventas-api.ts` y `createCliente()` en `lib/clientes-api.ts` ya existen. El `BroadcastChannel('dashboard_updates')` ya se usa para notificar al dashboard.

### 2. Objetivo de la Tarea
Diseñar el componente `Step6Confirmacion.tsx` que: muestra resumen completo de la venta, ejecuta la creación de la venta en Directus, genera un recibo PDF descargable con `jspdf`, y limpia el estado del Wizard. Este paso reemplaza la lógica de `handleFinish` que actualmente está en el Paso 4.

### 3. Fase del Roadmap y Dependencias
- **Fase:** B · **Posición:** 3/3 en Fase B · **Sprint:** 2
- **Dependencias previas completadas:** B-1 (arquitectura), B-2 (Step5 diseñado)
- **Dependencias necesarias pendientes:** Ninguna
- **Siguiente paso lógico:** Fase C-1 (Customer 360 — Ribbon de Estado)

### 4. Instrucciones para el Agente
Proporciona el diseño detallado del componente `Step6Confirmacion.tsx`:

**a) Layout del resumen** — describe la estructura visual del resumen de venta: secciones (Lote, Cliente, Términos Financieros, Documentos), datos a mostrar en cada sección, y cómo usar los tokens de diseño "Quintas" para jerarquía visual.

**b) Flujo de creación de venta** — describe los estados del proceso de confirmación: `idle` → `creating` → `success` | `error`. Incluye: qué mostrar en cada estado, cómo manejar el error de cliente duplicado (ya existe lógica en `handleFinish` actual), y cómo notificar al dashboard vía `BroadcastChannel`.

**c) Generación del recibo PDF** — describe la función `generarReciboPDF(venta, cliente, lote, terminos)` usando `jspdf` + `jspdf-autotable`: estructura del documento (encabezado con logo, datos de la venta, tabla de amortización resumida, pie de página con folio), y cómo disparar la descarga automática.

**d) Limpieza del estado** — describe la secuencia exacta post-éxito: guardar `ventaId` en variable local → limpiar `localStorage` → resetear `WizardState` → redirigir a `/ventas/{ventaId}`.

**e) Manejo de errores recuperables** — identifica los errores que permiten reintentar (error de red, timeout) vs. los que requieren reiniciar el wizard (lote ya vendido, cliente bloqueado).

### 5. Restricciones
- NO generar el componente completo; solo estructura, flujo y pseudocódigo
- NO reimplementar `createVenta()` ni `createCliente()`; reutilizar las existentes
- NO usar `alert()` ni `confirm()`; usar toasts de Sonner (ya instalado)
- El PDF debe generarse en el cliente (browser), no en el servidor
- Mantener el `BroadcastChannel` existente para notificaciones al dashboard
- El botón "Confirmar Venta" debe ser idempotente (no crear duplicados si se presiona dos veces)

### 6. Formato de Entrega
- Diagrama de estados del proceso de confirmación (idle/creating/success/error)
- Estructura del recibo PDF (secciones y campos)
- Pseudocódigo de `generarReciboPDF()` con los métodos de jspdf a usar
- Tabla de errores: Tipo | Recuperable | Acción propuesta
- Secuencia de limpieza post-éxito (pasos ordenados)

### 7. Autoauditoría
- [ ] ¿Cumple todos los requerimientos? (layout + flujo creación + PDF + limpieza + errores)
- [ ] ¿Está alineado con el sprint 2 y depende de B-1 y B-2?
- [ ] ¿Todas las dependencias previas están resueltas? (B-1 y B-2 completadas)
- [ ] ¿Mantiene coherencia con el roadmap? (no usa alert(), no reimplementa APIs existentes)

---

# ═══════════════════════════════════════
# FASE C — CUSTOMER 360
# ═══════════════════════════════════════

---

## Fase C - Tarea 1: Arquitectura Customer 360 y Ribbon de Estado

---

### 1. Contexto del Proyecto
Proyecto CRM inmobiliario Next.js 15. La vista `/clientes/[id]` (`app/clientes/[id]/page.tsx`) es un formulario básico con 2 tabs (Información General / Historial de Compras). Usa clases hardcodeadas de Tailwind (indigo, gray). Las APIs disponibles son: `fetchClienteById`, `fetchVentasByClienteId`, `fetchPagos`. El objetivo es transformarla en una vista de decisión en 5 segundos.

### 2. Objetivo de la Tarea
Diseñar la arquitectura completa del Customer 360: layout de 3 columnas, componentes necesarios, y el Ribbon de Estado (header con información crítica del cliente visible inmediatamente). El Ribbon debe mostrar: avatar/iniciales, nombre completo, badge de estatus, fecha de alta, y 3 acciones primarias (Nueva Venta, Registrar Pago, Generar Estado de Cuenta).

### 3. Fase del Roadmap y Dependencias
- **Fase:** C · **Posición:** 1/3 en Fase C · **Sprint:** 3
- **Dependencias previas completadas:** A-1, A-2 (Design Tokens aplicados al App Shell)
- **Dependencias necesarias pendientes:** Ninguna
- **Siguiente paso lógico:** C-2 (KPIs del Cliente), C-3 (Timeline de Actividad)

### 4. Instrucciones para el Agente
Analiza `app/clientes/[id]/page.tsx` y los tipos en `types/erp.ts`. Proporciona:

**a) Arquitectura de layout** — describe el layout de 3 columnas para desktop y su colapso en móvil. Especifica: ancho de cada columna (%), qué componente va en cada columna, y el orden de apilamiento en móvil. Propone si el layout debe ser un Server Component o Client Component y justifica.

**b) Inventario de componentes nuevos** — lista los componentes a crear en `components/clientes/`: nombre, responsabilidad, props principales, y si son Server o Client Components. Mínimo: `ClienteRibbon`, `ClienteKPIs`, `ClienteTimeline`, `ClienteAcciones`.

**c) Diseño del Ribbon** — describe en detalle el componente `ClienteRibbon`: avatar con iniciales (cómo generarlas desde nombre+apellido), badge de estatus del cliente (cómo determinarlo desde sus ventas: sin ventas=Prospecto, con venta activa=Cliente Activo, todas liquidadas=Cliente Liquidado), y las 3 acciones primarias con sus rutas/callbacks.

**d) Estrategia de carga de datos** — el Customer 360 necesita datos de múltiples fuentes (cliente, ventas, pagos). Propone si usar: Promise.all en el Server Component, SWR/React Query, o el patrón actual de useEffect. Justifica considerando el tiempo de carga percibido.

**e) Migración de la página actual** — describe cómo migrar `app/clientes/[id]/page.tsx` al nuevo layout sin perder la funcionalidad existente (formulario de edición, tabla de ventas).

### 5. Restricciones
- NO generar los componentes completos; solo arquitectura, interfaces y descripción
- NO añadir SWR ni React Query; usar el patrón de fetching existente en el proyecto
- NO eliminar la funcionalidad de edición de cliente existente; integrarla en el nuevo layout
- Mantener compatibilidad con NextAuth v5 y el patrón `use(params)` de Next.js 15
- Los 3 botones de acción primaria deben usar tokens de diseño "Quintas" (primary, accent)
- El layout debe ser responsive sin añadir breakpoints personalizados

### 6. Formato de Entrega
- Diagrama textual del layout de 3 columnas (desktop y móvil)
- Tabla de inventario de componentes (Nombre | Tipo | Props | Server/Client)
- Descripción detallada del Ribbon con lógica de badge de estatus
- Comparativa de estrategias de carga de datos con recomendación justificada
- Plan de migración de la página actual (pasos ordenados)

### 7. Autoauditoría
- [ ] ¿Cumple todos los requerimientos? (layout + inventario + ribbon + carga datos + migración)
- [ ] ¿Está alineado con el sprint 3?
- [ ] ¿Todas las dependencias previas están resueltas? (A-1 y A-2 completadas)
- [ ] ¿Mantiene coherencia con el roadmap? (no añade SWR/React Query, no elimina funcionalidad existente)

---

## Fase C - Tarea 2: KPIs del Cliente y Timeline de Actividad

---

### 1. Contexto del Proyecto
Proyecto CRM inmobiliario Next.js 15. La arquitectura del Customer 360 está definida (C-1 completada). Los tipos disponibles son: `Cliente`, `Venta` (con `EstatusVenta`), `Pago` (con `EstatusPago`) en `types/erp.ts`. Las APIs disponibles: `fetchVentasByClienteId`, `fetchPagos`. El componente `KPICard` en `components/dashboard/KPICard.tsx` ya existe y puede reutilizarse.

### 2. Objetivo de la Tarea
Diseñar los componentes `ClienteKPIs.tsx` (4 métricas clave calculadas desde datos reales) y `ClienteTimeline.tsx` (historial cronológico de eventos del cliente). Los KPIs deben calcularse en el frontend desde los datos ya cargados, sin llamadas adicionales a la API.

### 3. Fase del Roadmap y Dependencias
- **Fase:** C · **Posición:** 2/3 en Fase C · **Sprint:** 3
- **Dependencias previas completadas:** C-1 (arquitectura Customer 360 definida)
- **Dependencias necesarias pendientes:** Ninguna
- **Siguiente paso lógico:** C-3 (Acciones Rápidas del Cliente)

### 4. Instrucciones para el Agente
Proporciona el diseño detallado de los dos componentes:

**a) Definición de los 4 KPIs** — para cada KPI especifica: nombre, fórmula de cálculo (usando campos de `Venta[]` y `Pago[]`), formato de display (moneda/número/porcentaje/fecha), ícono de lucide-react propuesto, y condición de alerta (cuándo mostrar el KPI en color de advertencia). Los 4 KPIs propuestos: Total Invertido, Pagos al Corriente (%), Próximo Pago, Lotes Activos.

**b) Función de cálculo de KPIs** — describe la función `calcularKPIsCliente(ventas, pagos)` que retorna los 4 valores. Incluye el tipo de retorno `ClienteKPIs` y los casos borde (cliente sin ventas, ventas canceladas, pagos sin fecha).

**c) Reutilización de KPICard** — describe cómo adaptar el `KPICard` existente (que tiene `title`, `value`, `change`, `trend`, `icon`) para mostrar los KPIs del cliente. Identifica si se necesita una variante o si el componente existente es suficiente.

**d) Estructura del Timeline** — define el tipo `TimelineEvent` con: `id`, `tipo` (registro/venta/pago/documento/nota), `fecha`, `titulo`, `descripcion`, `icono`, `color`. Describe cómo construir el array de eventos desde `ventas[]` y `pagos[]`.

**e) Función `construirTimeline(cliente, ventas, pagos)`** — describe la lógica de construcción: qué evento genera cada tipo de dato, cómo ordenar cronológicamente (más reciente primero), y cómo limitar a los últimos N eventos con opción "Ver más".

### 5. Restricciones
- NO generar los componentes completos; solo interfaces, fórmulas y pseudocódigo
- NO hacer llamadas adicionales a la API; calcular desde datos ya disponibles en el componente padre
- NO usar Recharts en el Timeline; solo HTML/CSS con tokens de diseño
- El KPICard existente debe reutilizarse sin modificaciones si es posible
- Los cálculos deben manejar arrays vacíos sin lanzar errores
- Usar `date-fns` (ya instalado) para formateo de fechas en el Timeline

### 6. Formato de Entrega
- Tabla de KPIs (Nombre | Fórmula | Formato | Ícono | Condición de Alerta)
- Tipo TypeScript `ClienteKPIs` con todos los campos
- Pseudocódigo de `calcularKPIsCliente()` con manejo de casos borde
- Tipo `TimelineEvent` con todos los campos
- Pseudocódigo de `construirTimeline()` con lógica de ordenamiento
- Decisión justificada sobre reutilización vs. variante de KPICard

### 7. Autoauditoría
- [ ] ¿Cumple todos los requerimientos? (4 KPIs + cálculo + KPICard + Timeline + construirTimeline)
- [ ] ¿Está alineado con el sprint 3 y depende de C-1?
- [ ] ¿Todas las dependencias previas están resueltas? (C-1 arquitectura definida)
- [ ] ¿Mantiene coherencia con el roadmap? (no hace llamadas API adicionales, no usa Recharts en Timeline)

---

## Fase C - Tarea 3: Acciones Rápidas y Panel de Notas del Cliente

---

### 1. Contexto del Proyecto
Proyecto CRM inmobiliario Next.js 15. El Customer 360 tiene definidos el Ribbon (C-1) y los KPIs/Timeline (C-2). La columna derecha del layout (25%) debe contener: acciones rápidas del cliente y un panel de notas internas. El modal `ModalRegistrarPago` ya existe en `components/pagos/ModalRegistrarPago.tsx`. La exportación PDF usa `jspdf` (ya instalado).

### 2. Objetivo de la Tarea
Diseñar el componente `ClienteAcciones.tsx` con 4 acciones rápidas (Registrar Pago, Generar Estado de Cuenta PDF, Enviar Recordatorio, Agregar Nota) y el componente `ClienteNotas.tsx` para notas internas del vendedor sobre el cliente.

### 3. Fase del Roadmap y Dependencias
- **Fase:** C · **Posición:** 3/3 en Fase C · **Sprint:** 3
- **Dependencias previas completadas:** C-1 (arquitectura), C-2 (KPIs y Timeline)
- **Dependencias necesarias pendientes:** Ninguna
- **Siguiente paso lógico:** Fase D-1 (Command Palette — arquitectura)

### 4. Instrucciones para el Agente
Proporciona el diseño de los dos componentes:

**a) Inventario de acciones** — para cada una de las 4 acciones especifica: label, ícono (lucide-react), tipo de interacción (modal/navegación/función directa), estado de carga (si aplica), y condición de disponibilidad (ej: "Registrar Pago" solo si hay ventas activas).

**b) Integración con ModalRegistrarPago** — describe cómo invocar el modal existente desde `ClienteAcciones`, qué props pasarle (ventaId, clienteId, monto sugerido), y cómo manejar el callback de éxito para refrescar los KPIs del Customer 360.

**c) Generación de Estado de Cuenta PDF** — describe la función `generarEstadoCuentaPDF(cliente, ventas, pagos)`: estructura del documento (encabezado, resumen de ventas, tabla de pagos con estatus, saldo pendiente), y cómo disparar la descarga. Reutiliza el acercamiento de B-3.

**d) Diseño de ClienteNotas** — describe el componente: lista de notas existentes (texto, autor, fecha), formulario inline para agregar nota nueva, y cómo persistir las notas (campo `notas` en la tabla `clientes` de Directus o colección separada). Propone la opción más simple.

**e) Patrón de actualización optimista** — cuando se registra un pago o se agrega una nota, describe cómo actualizar la UI inmediatamente sin esperar la respuesta del servidor, y cómo revertir si hay error.

### 5. Restricciones
- NO generar los componentes completos; solo diseño, interfaces y pseudocódigo
- NO crear una nueva colección en Directus para notas; usar el campo `notas` existente en `clientes`
- NO reimplementar ModalRegistrarPago; reutilizarlo tal como está
- La acción "Enviar Recordatorio" puede ser un placeholder con toast "Próximamente" en este sprint
- Usar Sonner (ya instalado) para todos los toasts de feedback
- Las acciones deben usar tokens de diseño "Quintas" (primary para acción principal, secondary para secundarias)

### 6. Formato de Entrega
- Tabla de acciones (Label | Ícono | Tipo | Condición de Disponibilidad | Estado de Carga)
- Descripción de integración con ModalRegistrarPago (props y callback)
- Estructura del Estado de Cuenta PDF (secciones y campos)
- Decisión justificada sobre persistencia de notas (campo vs. colección)
- Pseudocódigo del patrón de actualización optimista

### 7. Autoauditoría
- [ ] ¿Cumple todos los requerimientos? (acciones + modal + PDF + notas + optimista)
- [ ] ¿Está alineado con el sprint 3 y depende de C-1 y C-2?
- [ ] ¿Todas las dependencias previas están resueltas? (C-1 y C-2 completadas)
- [ ] ¿Mantiene coherencia con el roadmap? (no crea colección nueva, no reimplementa modal)

---

# ═══════════════════════════════════════
# FASE D — COMMAND PALETTE & MOBILE NAV
# ═══════════════════════════════════════

---

## Fase D - Tarea 1: Arquitectura del Command Palette (Ctrl+K)

---

### 1. Contexto del Proyecto
Proyecto CRM inmobiliario Next.js 15 + Zustand (ya instalado). El Navbar (`components/layout/Navbar.tsx`) es un Client Component con `usePathname`. Las APIs de búsqueda disponibles son: `searchClientes(query, token)` en `lib/clientes-api.ts` y `fetchLotes` en `lib/directus-api.ts`. El hook `useDebounce` ya existe en `hooks/useDebounce.ts`. No existe ningún componente de Command Palette actualmente.

### 2. Objetivo de la Tarea
Diseñar la arquitectura completa del Command Palette: store de Zustand para estado global, hook `useCommandPalette`, componente `CommandPalette.tsx`, y sistema de comandos/acciones. El palette debe activarse con Ctrl+K (Windows/Linux) y Cmd+K (macOS), buscar en clientes/lotes/ventas, y ejecutar acciones rápidas de navegación.

### 3. Fase del Roadmap y Dependencias
- **Fase:** D · **Posición:** 1/2 en Fase D · **Sprint:** 4
- **Dependencias previas completadas:** A-1, A-2 (Design Tokens), C-1, C-2, C-3 (Customer 360)
- **Dependencias necesarias pendientes:** Ninguna
- **Siguiente paso lógico:** D-2 (Sidebar Responsive + Mobile Navigation)

### 4. Instrucciones para el Agente
Proporciona la arquitectura completa del Command Palette:

**a) Store de Zustand** — diseña `useCommandPaletteStore` con: estado (`isOpen`, `query`, `results`, `selectedIndex`, `recentSearches`), acciones (`open`, `close`, `toggle`, `setQuery`, `setResults`, `selectNext`, `selectPrev`, `clearRecents`). Propone si usar `persist` middleware para `recentSearches`.

**b) Tipos de comandos** — define el tipo `PaletteCommand` con: `id`, `type` (navigation/action/search-result), `label`, `description`, `icon`, `shortcut` (opcional), `action` (función o ruta). Define los comandos estáticos de navegación (Dashboard, Mapa, Nueva Venta, etc.) y cómo se mezclan con resultados dinámicos de búsqueda.

**c) Hook `useCommandPalette`** — describe el hook que: registra el listener de teclado (Ctrl/Cmd+K), implementa búsqueda debounced (300ms) usando `useDebounce` existente, llama a `searchClientes` y búsqueda de lotes en paralelo, y maneja navegación con flechas + Enter.

**d) Estructura del componente** — describe `CommandPalette.tsx`: overlay con backdrop, input de búsqueda, secciones de resultados (Acciones Rápidas / Clientes / Lotes / Ventas), item de resultado con highlight del texto buscado, y footer con atajos de teclado.

**e) Integración en App Shell** — describe dónde renderizar el `CommandPalette` (en `app/layout.tsx` fuera del flujo principal), cómo añadir el botón de activación en el Navbar (visible en desktop, con atajo Ctrl+K), y el focus trap para accesibilidad.

### 5. Restricciones
- NO generar los archivos completos; solo arquitectura, tipos e interfaces
- NO añadir librerías de Command Palette externas (cmdk, etc.); implementar desde cero
- NO hacer búsquedas sin debounce; usar el `useDebounce` existente
- El overlay debe usar `position: fixed` con `z-index` superior al Navbar (`z-50`)
- Implementar focus trap (Tab/Shift+Tab dentro del palette, Escape para cerrar)
- Los resultados de búsqueda deben limitarse a 5 por categoría para no saturar la UI
- Usar tokens de diseño "Quintas" para el palette (bg-card, border-border, text-foreground)

### 6. Formato de Entrega
- Interfaz del store de Zustand (estado + acciones)
- Tipo `PaletteCommand` con todos los campos
- Lista de comandos estáticos de navegación (mínimo 8)
- Descripción del hook `useCommandPalette` con pseudocódigo del listener de teclado
- Diagrama textual de la estructura del componente (secciones y elementos)
- Plan de integración en App Shell (dónde y cómo)

### 7. Autoauditoría
- [ ] ¿Cumple todos los requerimientos? (store + tipos + hook + componente + integración)
- [ ] ¿Está alineado con el sprint 4?
- [ ] ¿Todas las dependencias previas están resueltas? (A-1, A-2, C-1, C-2, C-3 completadas)
- [ ] ¿Mantiene coherencia con el roadmap? (no usa cmdk, no genera archivos completos, usa useDebounce existente)

---

## Fase D - Tarea 2: Sidebar Responsive y Mobile Navigation

---

### 1. Contexto del Proyecto
Proyecto CRM inmobiliario Next.js 15 + Zustand. El sidebar de `/dashboard` (`app/dashboard/layout.tsx`) usa `hidden md:block` sin alternativa móvil. El Navbar (`components/layout/Navbar.tsx`) no tiene botón hamburguesa. El Portal de Clientes (`app/portal/(dashboard)/layout.tsx`) tampoco tiene navegación móvil. Zustand ya está instalado y se usará para el estado del drawer (D-1).

### 2. Objetivo de la Tarea
Diseñar el Mobile Drawer para el sidebar de `/dashboard` y la Bottom Navigation para el Portal de Clientes en móvil. Incluye: store de Zustand para estado del drawer, componente `MobileSidebarDrawer.tsx`, botón hamburguesa en Navbar, y `BottomNav.tsx` para el portal.

### 3. Fase del Roadmap y Dependencias
- **Fase:** D · **Posición:** 2/2 en Fase D · **Sprint:** 4
- **Dependencias previas completadas:** D-1 (Command Palette arquitectura definida), A-2 (App Shell actualizado)
- **Dependencias necesarias pendientes:** Ninguna
- **Siguiente paso lógico:** Fase F (WebSocket Tiempo Real) — Sprint 5

### 4. Instrucciones para el Agente
Proporciona el diseño completo de la navegación móvil:

**a) Store de Zustand para drawer** — diseña `useSidebarStore` con: `isOpen` (boolean), `open()`, `close()`, `toggle()`. Propone si compartir el store con el Command Palette o mantenerlos separados, y justifica.

**b) Componente MobileSidebarDrawer** — describe: posicionamiento (`fixed inset-0 z-40`), overlay con `backdrop-blur-sm` y `bg-black/50`, panel lateral (`w-72 bg-card`) con animación de entrada (slide desde izquierda), mismo contenido que el sidebar desktop (mismos `sidebarItems`), botón de cierre (X) en la esquina superior derecha, y cierre al hacer click en el overlay.

**c) Actualización del Navbar** — describe cómo añadir el botón hamburguesa: visible solo en `md:hidden`, ícono `Menu` de lucide-react, conectado al `useSidebarStore`, y posicionado a la izquierda del logo en móvil.

**d) Actualización de DashboardLayout** — describe cómo integrar `MobileSidebarDrawer` en `app/dashboard/layout.tsx` sin romper el sidebar desktop existente. Propone si el drawer debe ser un Server o Client Component.

**e) BottomNav para Portal de Clientes** — diseña el componente `BottomNav.tsx`: 4 items (Inicio, Mis Pagos, Documentos, Perfil), visible solo en `md:hidden`, posicionado `fixed bottom-0`, altura `h-16`, usa tokens de diseño "Quintas", indicador de item activo con `usePathname`.

### 5. Restricciones
- NO generar los componentes completos; solo diseño, interfaces y pseudocódigo
- NO usar librerías de drawer externas; implementar con Tailwind CSS + transiciones CSS
- NO modificar el sidebar desktop existente; el drawer es adicional para móvil
- El drawer debe cerrarse automáticamente al navegar a una nueva ruta (usar `usePathname` + `useEffect`)
- El `BottomNav` debe añadir `pb-16` al contenido del portal para evitar que quede oculto
- Usar `aria-expanded`, `aria-controls` y `role="dialog"` para accesibilidad del drawer

### 6. Formato de Entrega
- Interfaz del store `useSidebarStore`
- Descripción detallada del MobileSidebarDrawer (posicionamiento, animación, overlay)
- Plan de actualización del Navbar (qué añadir y dónde)
- Plan de integración en DashboardLayout
- Diseño del BottomNav (items, posicionamiento, estilo activo)
- Lista de consideraciones de accesibilidad (ARIA, focus management)

### 7. Autoauditoría
- [ ] ¿Cumple todos los requerimientos? (store + drawer + navbar + layout + bottomnav)
- [ ] ¿Está alineado con el sprint 4 y depende de D-1 y A-2?
- [ ] ¿Todas las dependencias previas están resueltas? (D-1 y A-2 completadas)
- [ ] ¿Mantiene coherencia con el roadmap? (no usa librerías externas, no modifica sidebar desktop, cierre automático al navegar)

---

# ═══════════════════════════════════════
# APÉNDICE: GUÍA DE USO DE PROMPTS
# ═══════════════════════════════════════

## Orden de Ejecución Recomendado

```
Sprint 1 (Semana 1): A-1 → A-2
Sprint 2 (Semana 2): B-1 → B-2 → B-3
Sprint 3 (Semana 3): C-1 → C-2 → C-3
Sprint 4 (Semana 4): D-1 → D-2
```

## Cómo Usar Cada Prompt en trae.ai

1. Copiar el prompt completo (secciones 1-7)
2. Pegar en trae.ai como nueva tarea
3. El agente debe responder siguiendo la estructura R7
4. Verificar la autoauditoría antes de marcar como completado
5. El output de cada tarea es el input de la siguiente

## Terminología Consistente (R8)

| Término | Uso |
|---------|-----|
| `tarea` | Unidad de trabajo dentro de un sprint |
| `sprint` | Ciclo de desarrollo (1 semana) |
| `roadmap` | Plan general de 8 semanas |
| `dependencias` | Requisitos previos de una tarea |
| `acercamiento` | Enfoque propuesto para resolver un problema |
| `documentación` | Artefactos escritos generados |
| `robustecimiento` | Mejora de calidad, eficiencia o arquitectura |

## Métricas de Éxito por Fase

| Fase | Métrica Principal | Criterio de Éxito |
|------|------------------|-------------------|
| A | Consistencia visual | 100% de tokens semánticos en App Shell |
| B | Completitud del Wizard | 6/6 pasos funcionales con PDF |
| C | Tiempo de decisión | KPIs visibles en < 2s de carga |
| D | Navegabilidad | Ctrl+K funcional + drawer móvil sin layout shift |

---

*Documento generado para: Quintas de Otinapa CRM · Versión 0.4.0 · Metodología Vibe-Coding*
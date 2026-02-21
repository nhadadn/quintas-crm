# Quintas OS — Documento Maestro de Roadmap y Especificación de Diseño

## 1. Análisis de usuarios y contexto

**Usuarios clave**

- Asesores de ventas: necesitan cerrar operaciones rápido, con mínima fricción y datos confiables.
- Postventa/Operaciones: seguimiento de contratos, pagos y documentación.
- Dirección/Finanzas/Administrador: reporting, proyecciones y control de inventario.

**Contexto y posicionamiento**

- Referencia visual: Mountain Luxury Community. Estética sobria, natural, premium. Bosque de pino-encino, praderas, microclima templado.
- Objetivo: sofisticación visual comparable a la referencia, con robustez de ERP y performance SaaS.
- Principios: simplicidad, consistencia, feedback inmediato, prevención de errores, accesibilidad WCAG 2.1 AA.

## 2. Arquitectura de información

**Dominios principales**

- Inventario de lotes: estados Disponible/Apartado/Vendido + metadatos.
- CRM: Prospectos, Clientes, Oportunidades, Actividades, Documentos.
- Ventas: cotizaciones, contratos, pagos/financiamiento.
- Reportes: dashboards, exportaciones.

**Estructura global**

- Navegación persistente por Sidebar + Topbar minimal.
- Command Palette (Ctrl/⌘+K) para acciones/entidades.
- Notificaciones: toasts para feedback inmediato y bandeja tipo Inbox para histórico.

## 3. Matriz de Design Tokens (HSL — Light, alineado a referencia)

> Nota: los valores HSL se definen como «h s% l%». Las variables se consumen con `hsl(var(--token) / <alpha>)`. Paleta derivada de la estética de montaña premium: verde pino profundo, acentos dorados, marrones terrosos y superficies marfil.

### 3.1 Colores semánticos

```yaml
color:
  light:
    primary: 158 25% 22% # Verde pino
    on-primary: 0  0% 100%
    secondary: 26 30% 33% # Corteza
    on-secondary: 0  0% 100%
    accent: 43 86% 55% # Dorado
    on-accent: 156 27% 12%

    surface: 40 40% 97% # Marfil cálido
    surface-variant: 40 30% 94%
    on-surface: 210 13% 11%
    muted: 210 10% 60%
    border: 30 15% 86%

    success: 150 55% 35%
    warning: 37 95% 44%
    error: 0 70% 50%
    info: 200 80% 45%
```

Swatches (aprox. HEX)

- primary ≈ #1E3A33, accent ≈ #F2C14E, secondary ≈ #6B4F3B, surface ≈ #FAF6EF, on-surface ≈ #111827

### 3.2 Tipografía

- Families
  - brand: 'Playfair Display', 'Times New Roman', serif
  - ui: 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif
- Pesos: 300, 400, 500, 600, 700
- Escala (font-size/line-height)
  - text.xs: 12/16
  - text.sm: 14/20
  - text.md: 16/24 (base)
  - text.lg: 18/28
  - text.xl: 20/28
  - display.sm: 24/32
  - display.md: 30/38
  - display.lg: 36/44

### 3.3 Espaciado, radios, bordes, elevación y motion

```yaml
space: [4, 8, 12, 16, 24, 32, 40, 56, 72]
radius:
  xs: 4
  sm: 8
  md: 12
  lg: 16
  xl: 24
border:
  hairline: 1
  regular: 1.5
  bold: 2
shadow:
  s-100: 0 1px 2px hsl(210 20% 2% / 0.06)
  s-200: 0 2px 6px hsl(210 20% 2% / 0.08)
  s-300: 0 6px 12px hsl(210 20% 2% / 0.10)
  s-400: 0 10px 20px hsl(210 20% 2% / 0.12)
  s-500: 0 14px 28px hsl(210 20% 2% / 0.14)
  premium-glow: 0 0 0 1px hsl(43 90% 50% / 0.12), 0 12px 32px hsl(156 27% 22% / 0.10)
motion:
  duration:
    fast: 120ms
    base: 180ms
    slow: 260ms
  easing:
    standard: cubic-bezier(0.2, 0.0, 0.0, 1)
    entrance: cubic-bezier(0.05, 0.7, 0.1, 1)
    exit: cubic-bezier(0.4, 0.0, 1, 1)
opacity:
  disabled: 0.38
  overlay: 0.64
z:
  dropdown: 1000
  modal: 1100
  toast: 1200
  command: 1300
breakpoints:
  sm: 640px
  md: 768px
  lg: 1024px
  xl: 1280px
  2xl: 1536px
```

## 4. Inventario de componentes (Atomic Design)

**Átomos**

- Botón (filled/tonal/ghost), IconButton, Tag, Chip, Badge.
- Input Text, Number, Select, Date, Toggle, Checkbox, Radio, TextArea.
- Tooltip, Divider, Avatar, Progress, Spinner, Toast.

**Moléculas**

- FormRow (label + control + help), InlineValidation.
- SearchField con sugerencias.
- StatMini (valor + tendencia), Breadcrumb.
- Card (header, body, footer) con variantes.

**Organismos**

- Wizard de Venta (steps, progress, validator, autosave).
- Mapa Interactivo SVG (zoom/pan/selección, leyenda, filtros).
- DataTable (virtualizada, sort/filter/pagination, columnas configurables).
- Customer 360 Panel (ribbon de estado, KPIs, timeline, acciones).
- Command Palette (acciones, navegación, búsqueda/global search).
- Notifications Center (toasts + inbox con filtros y leídos/no leídos).

**Templates / Pages**

- Dashboard Comercial.
- Inventario de Lotes.
- Clientes & Oportunidades.
- Ventas & Contratos.
- Ajustes (perfil, equipos, permisos).

## 5. Arquitectura de la Experiencia (UX)

### 5.1 Wizard de Venta Multi‑paso

Objetivo: reducir carga cognitiva y asegurar datos completos sin fricción.

Pasos y datos por etapa

1. Prospecto e Identificación

- Cliente (buscar/crear), canal de adquisición, asesor responsable.
- Datos básicos: nombre, email, teléfono, RFC opcional.

2. Preferencias y Calificación

- Tipo de lote (campestre/villa/estancia/hacienda), presupuesto, horizonte temporal.
- Scoring simple (capacidad de pago, interés), notas.

3. Selección de Lote (Mapa)

- Filtros por estatus, superficie, precio, orientación.
- Selección única o múltiple para comparación rápida.

4. Condiciones Comerciales

- Precio base, descuentos autorizados, enganche (mín 10%), plazos 12/24/36.
- Simulador de mensualidades, TAE, fechas clave.

5. Documentación y Verificación

- Carga de INE/comprobante (Directus Files), KYC básico.
- Validaciones previas al contrato.

6. Resumen y Cierre

- Resumen acordado, términos, checklist, generación de contrato.
- Firma electrónica o agendado de cita.

Comportamientos

- Autosave por paso, validación incremental, bloqueo de avanzar si faltan campos críticos.
- Estado de progreso visible y persistente; retomable.
- Accesos directos: Command Palette para saltar a buscar cliente o lotes.

### 5.2 Customer 360 View (decisión en 5 segundos)

Jerarquía inmediata

- Ribbon superior: Nombre + badges de estado (Prospecto/Cliente activo/Deuda) y nivel de riesgo.
- KPIs en primera línea: Valor pipeline activo, lote(s) involucrado(s), próximo evento/recordatorio, días desde último contacto.
- Panel izquierdo: Datos de contacto, preferencias, documentos clave.
- Panel derecho: Timeline (actividades, notas, emails), tareas y próximos pasos.
- Acciones primarias: Llamar, Agendar, Generar cotización, Abrir contrato.

Reglas de visibilidad

- Mostrar máximo 5 KPIs, con tooltips detallados.
- Estados críticos resaltados con accent o warning.

### 5.3 Navegación Global

- Sidebar: Dashboard, Mapa, Clientes, Oportunidades, Ventas, Finanzas, Reportes, Ajustes.
- Modos: expandido (etiquetas) / colapsado (íconos) / responsive (drawer en móviles).
- Command Palette: Ctrl/⌘+K → búsqueda de entidades, acciones (crear cliente, nueva oportunidad), navegación rápida.
- Notificaciones: toasts para feedback transaccional + Inbox con filtros (tipo, fecha, leído) y paginación.

## 6. Especificación del Mapa Interactivo (Core Feature)

### 6.1 Interacciones principales

- Zoom: rueda/pinch, botones +/−, doble clic; límites 0.8×–8×; easing estándar.
- Pan: click & drag / touch pan; inercia mínima.
- Selección de lotes: hover resalta borde + tooltip; click selecciona (abre panel lateral con ficha).
- Multi‑selección (comparar): con modificador (Shift) o modo “Comparar”.
- Leyenda/Estado visual: Disponible, Apartado, Vendido, No disponible.

Estados visuales (HSL sugerido)

- Disponible: hsl(150 55% 35% / 0.35) fill + borde hsl(150 55% 35%).
- Apartado: hsl(37 95% 44% / 0.40) + patrón sutil.
- Vendido: hsl(0 70% 50% / 0.40) + hatch.
- Hover: borde accent + sombra interior suave.
- Focus (teclado): outline 2px hsl(var(--color-accent) / 0.9), offset 2px.
- Selección: trazo 2px accent y glow premium-glow.

Accesibilidad

- Todos los lotes son `focusable` con navegación por teclado.
- Tooltips con `aria-describedby`; roles adecuados en SVG (`aria-label`).
- Contraste mínimo 4.5:1 en labels y leyenda.

### 6.2 Datos y estructura

- Cada lote: { id, path/svgId, estado, superficie, precio, manzana, vínculos }.
- Capa de datos separada del SVG (mapa base + mapping id↔path).

### 6.3 Sincronización en Tiempo Real (Directus 10)

- Canal de suscripción: colección `lotes` (items.update/create/delete) y `apartados`/`ventas` para transiciones.
- Estrategia
  - Suscripción WebSocket a eventos (SDK Directus) por proyecto/tenant.
  - Actualización de estado in‑place; evitar recarga.
  - Optimistic UI al apartar: estado local → “apartando…”, rollback si 409/conflicto.
  - Debounce de ráfagas de eventos y coalescing por id.
- Resolución de conflictos
  - Fuente de verdad: Directus (permisos transaccionales garantizan unicidad de apartado/venta por lote).
  - Si el servidor rechaza, mostrar toast de error y refrescar estado del lote.

### 6.4 Performance del mapa

- Presupuesto inicial: payload vectorial ≤ 300KB gzip por sección; LCP mapa ≤ 2.2s en 4G/median;
- Uso de `requestAnimationFrame` para pan/zoom; evitar layout thrash.
- Diferir carga de anotaciones/labels a post‑idle.

## 7. Estándares de Calidad

### 7.1 Accesibilidad (WCAG 2.1 AA)

- Contraste mínimo 4.5:1 en texto normal; 3:1 en grande ≥ 24px.
- Soporte completo teclado (Tab/Shift+Tab, Enter/Espacio, Escape para cerrar modales).
- Focus visible consistente; evitar trap de foco.
- Etiquetas y descripciones: `aria-label`, `aria-describedby`, `aria-live` para toasts.
- Lectores de pantalla: orden lógico, headings y landmarks (`nav`, `main`, `aside`).
- Formularios: errores en texto + color; mensajes claros, no solo color.

### 7.2 Performance

- Presupuestos
  - LCP ≤ 2.5s (páginas principales), TTI ≤ 2.0s, CLS ≤ 0.1.
  - Tabla virtualizada a partir de >1,000 filas; target 60fps scroll.
  - Imágenes/Assets: usar WebP/AVIF; SVG optimizado; lazy loading.
- Estrategias
  - Segmentación de bundle y lazy de features pesadas (mapa, data‑viz).
  - Server Components (Next.js App Router) donde aporte.
  - Cache en capa de datos; revalidación estratégica.

## 8. Design System — Especificación

### 8.1 Paleta y uso

- Primary: acciones principales, CTAs y elementos de énfasis.
- Secondary: navegación y contenedores.
- Accent: realces, indicadores y focus visible.
- Surface: fondos y tarjetas; variantes para separar secciones.
- Muted/Border: divisores, contornos y estados desactivados.

### 8.2 Tipografía (reglas)

- Branding (serif) para hero, títulos de alto impacto y materiales de marketing.
- UI (sans) para tablas, formularios y navegación.
- Jerarquía clara: máximo 3 niveles visibles simultáneamente.

### 8.3 Estados y feedback

- Default, hover, active, disabled, loading, error para todos los controles.
- Duración estándar 180ms; curvas suaves; micro‑interacciones discretas.

### 8.4 Componentes clave (comportamientos)

- Button: tamaños sm/md/lg; variantes filled/tonal/ghost; loading con spinner inline; `aria-busy`.
- Input: validación onBlur; ayuda contextual; iconos opcionales; mensajes de error persistentes.
- DataTable: columnas reordenables, persistencia de preferencias, filtros guardados.
- Command Palette: fuzzy search, acciones rápidas, historial reciente.
- Notifications: toasts autocerrables + acciones; Inbox con marca leídos/no leídos.

## 9. Roadmap de Ejecución (8 semanas)

### Milestone 1 (Semanas 1–2): Fundaciones de Design System y Prototipo Mapa

**Objetivos**

- Definir y documentar tokens, tipografía, espacios, sombras, estados.
- Prototipo navegable del mapa SVG con zoom/pan y estados visuales.
- Layouts base: Sidebar, Topbar, Shell de aplicación.

**Componentes**

- Tokens y theming (light‑only).
- Botones, Inputs, Cards, Tooltip, Toast.
- Mapa SVG (estático) + leyenda.

**Criterios de aceptación (DoD)**

- Tokens publicados y consumibles; contraste validado AA en muestras.
- Mapa hace zoom/pan a 60fps en laptop media; leyenda funcional.
- Shell responsive con Sidebar expand/collapse.

### Milestone 2 (Semanas 3–4): Navegación, Command Palette y Wizard v1

**Objetivos**

- Implementar Sidebar/Topbar definitivos y Command Palette.
- Wizard de Venta con pasos 1–4; autosave básico.
- Integrar Directus SDK y esqueleto de suscripción.

**Componentes**

- Sidebar (estados y permisos), Command Palette (Ctrl/⌘+K).
- Wizard (steps, progress, validación por paso).
- Servicio de datos (Directus) con mock de eventos.

**DoD**

- Navegación accesible por teclado; focus visible.
- Wizard permite avanzar/retroceder con datos persistidos.
- Suscripción recibe eventos simulados y actualiza UI sin recarga.

### Milestone 3 (Semanas 5–6): Customer 360, DataTable y Realtime del Mapa

**Objetivos**

- Customer 360 con KPIs, ribbon y timeline.
- DataTable virtualizada para listados grandes.
- Mapa conectado a Directus realtime (lotes/apartados/ventas).

**Componentes**

- Panel 360, Timeline, KPIs, Acciones rápidas.
- DataTable con sorting/filter/pagination.
- Adaptador de eventos y reconciliación de estado en mapa.

**DoD**

- 5‑second test: usuarios identifican estado del cliente y siguiente acción.
- Tabla mantiene 60fps con >10k filas.
- Eventos de cambio de estado de lote reflejados en <300ms en UI local.

### Milestone 4 (Semanas 7–8): Accesibilidad, Performance y Cierre

**Objetivos**

- Auditoría WCAG AA; correcciones.
- Optimización de assets, carga diferida y métricas core web vitals.
- Documentación final y handoff.

**Componentes**

- Axe/WAVE/Lighthouse checks.
- Optimizaciones de mapa y tablas; reducción de payloads.
- Guías de componentes y tokens.

**DoD**

- Lighthouse ≥ 90 en Performance/Accessibility/Best Practices en páginas clave.
- Contraste y navegación por teclado verificados.
- Documentación completa y lista para desarrollo.

## 10. Cronograma detallado por semana

**Semana 1**

- Cierre de paleta HSL, tipografía, spacing, sombras, motion.
- Prototipo de tokens en tema light; muestras de contraste.
- Wireframes: Sidebar/Topbar; mapa SVG estático.

**Semana 2**

- Construcción de átomos (Button, Input, Card, Tooltip, Toast).
- Prototipo de mapa con zoom/pan; leyenda y estados.
- Shell responsive y pruebas iniciales de accesibilidad.

**Semana 3**

- Sidebar final (expand/collapse) + navegación con rutas.
- Command Palette con búsqueda y acciones stub.
- Wizard pasos 1–2 con autosave y validación.

**Semana 4**

- Wizard pasos 3–4 + integración simulada con mapa.
- Integración Directus SDK; mock de eventos realtime.
- Documentar flujos del Wizard; pruebas de usabilidad internas.

**Semana 5**

- Customer 360: ribbon, KPIs, paneles y timeline base.
- DataTable: estructura, virtualización y sort/filter.
- Adaptador realtime para `lotes` (suscripción y actualización local).

**Semana 6**

- Customer 360: acciones rápidas y mejoras de jerarquía.
- DataTable: persistencia de preferencias; filtros guardados.
- Mapa: reconciliación de conflictos y optimistic UI al apartar.

**Semana 7**

- Auditoría WCAG AA completa; correcciones visuales/semánticas.
- Optimización de mapa (payloads, defer de labels) y tablas.
- Medición CWV; ajustes de lazy y split.

**Semana 8**

- Documentación de componentes y tokens.
- Playbooks de QA y casos de prueba.
- Revisión final, sign‑off y preparación de despliegue.

## 11. Especificaciones para desarrollo (tokens, componentes, assets)

- Design tokens: expuestos como CSS vars `--color-…`, `--space-…`, `--radius-…` y equivalentes TS/JSON.
- Theming: tema único light (sin modo oscuro en este release).
- Estados: todas las interacciones definen default/hover/active/disabled/loading/error.
- Accesibilidad: componentes con roles/labels; focus ring consistente.
- Assets: SVG optimizados (SVGO); imágenes en WebP/AVIF; fuentes con subsets.

## 12. Guía de estilo para prompts de codificación

Usar este formato para solicitar a agentes de desarrollo:

```
Objetivo
- Implementar [componente/feature] alineado al Design System y UX definidos.

Contexto
- Ruta/página: /[ruta]
- Dependencias existentes: Next.js App Router, Directus 10 (SDK), Prisma.

Tokens y estilos
- Colores: usar `--color-primary`, `--color-surface`, etc.
- Tipografía: family ui para datos; brand solo en títulos hero.
- Espaciado y sombras: `--space-*`, `--shadow-*`.

Comportamiento y estados
- Estados requeridos: default/hover/active/disabled/loading/error.
- Accesibilidad: foco visible, roles adecuados, lectura por teclado.

Datos
- Colecciones Directus involucradas: [nombre].
- Eventos realtime esperados: items.update/create/delete.

Criterios de aceptación
- UI cumple contraste AA; tests de interacción pasan.
- Performance dentro de presupuestos; no regresiones.

Entregables
- Componentes y pruebas; documentación breve de props/estados.
```

---

Este documento define la identidad visual, la arquitectura UX y el plan de ejecución de 8 semanas para evolucionar Quintas CRM hacia Quintas OS con una experiencia premium, accesible y de alto desempeño.

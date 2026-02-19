# 🗺️ ROADMAP — QUINTAS DE OTINAPA CRM
## Próximos Pasos: Análisis del Estado Actual y Plan de Acción

> **Fecha de análisis:** Basado en revisión completa del repositorio `nhadadn/quintas-crm` (rama `main`)
> **Versión actual:** 0.4.0
> **Stack:** Next.js 15 · Directus 10 · MySQL 8 · Redis · Stripe · NextAuth v5

---

## 📊 ESTADO ACTUAL DEL PROYECTO (Diagnóstico)

### ✅ Lo que YA está implementado y funcional

| Módulo | Estado | Notas |
|--------|--------|-------|
| **Auth (NextAuth v5)** | ✅ Completo | Login, logout, recuperación de contraseña, roles (Admin/Vendedor/Cliente), RLS |
| **Mapa SVG Interactivo** | ✅ Funcional | Zoom/pan, selección de lotes, filtros, leyenda, panel de detalle, colores por estatus |
| **Wizard de Venta (4 pasos)** | ✅ Funcional | Selección lote → Datos cliente → Términos → Confirmación. Autosave en localStorage |
| **Dashboard Analytics** | ✅ Funcional | KPIs, gráficos Recharts, ventas por mes, ranking vendedores, pagos recientes |
| **Gestión de Ventas** | ✅ Funcional | CRUD, detalle con tabs (info/pagos/amortización) |
| **Gestión de Pagos** | ✅ Funcional | Tabla, modal registro, marcar pagado, descarga reporte |
| **Gestión de Clientes** | ✅ Funcional | CRUD, detalle con historial de ventas |
| **Gestión de Vendedores** | ✅ Funcional | CRUD, detalle con comisiones |
| **Portal de Clientes** | ✅ Funcional | Dashboard, historial pagos, documentos, Stripe payment |
| **Comisiones** | ✅ Funcional | Cálculo automático, tabla ranking, dashboard |
| **Reportes** | ✅ Funcional | Gráficos multi-tipo, filtros por fecha, exportación |
| **Reembolsos** | ✅ Funcional | Solicitud, aprobación/rechazo |
| **Stripe Integration** | ✅ Funcional | Payment Intent, suscripciones, webhooks |
| **Developer Portal** | ✅ Funcional | OAuth2, apps, webhooks, métricas |
| **Docker / Infra** | ✅ Completo | MySQL + Redis + Directus + Next.js, zero-config |
| **Design System (Tailwind)** | ⚠️ Parcial | Tokens definidos en `tailwind.config.ts` pero `globals.css` usa paleta genérica shadcn |
| **Design Tokens HSL** | ⚠️ Pendiente | `UI_UX_ROADMAP.md` entregado pero NO aplicado al código |

### ⚠️ Brechas Críticas Identificadas

1. **Design Tokens no aplicados:** `globals.css` usa la paleta genérica de shadcn/ui (azul-gris), no la paleta "Quintas" (verde pino + dorado + marfil) definida en `tailwind.config.ts` y en el `UI_UX_ROADMAP.md`.
2. **Inconsistencia visual App Shell:** `app/layout.tsx` usa `bg-slate-950 text-slate-50` (dark slate), mientras que el Design System define `Surface: hsl(40 40% 97%)` (marfil claro). El sistema es visualmente "oscuro" pero el DS pide "light-only".
3. **Wizard de Venta incompleto:** Solo 4 pasos implementados vs. 6 especificados en el roadmap UX (falta: Paso 5 - Documentos/Firma, Paso 6 - Confirmación final con recibo).
4. **Customer 360 ausente:** La vista de detalle de cliente (`/clientes/[id]`) es un formulario básico, no el "Customer 360" con ribbon de estado, KPIs, timeline y acciones primarias especificado.
5. **Command Palette (Ctrl+K) no implementado.**
6. **Sidebar responsive/mobile drawer ausente** en `/dashboard`.
7. **Notificaciones (toasts + inbox)** solo parcialmente implementadas (solo toasts con Sonner, sin inbox persistente).
8. **Tiempo real Directus WebSocket** configurado en `docker-compose.yml` (`WEBSOCKETS_ENABLED: true`) pero NO consumido en el frontend.
9. **`globals.css` no actualizado** con los tokens HSL del `UI_UX_ROADMAP.md`.
10. **Configuración page** (`/dashboard/configuracion`) es un placeholder estático sin funcionalidad real.

---

## 🚀 ROADMAP DE PRÓXIMOS PASOS

### PRIORIDAD CRÍTICA — Fundación Visual (Semana 1-2)

---

### 🎨 FASE A: Aplicar Design System "Quintas" al Código

**Objetivo:** Unificar la identidad visual. Actualmente hay 3 paletas en conflicto: shadcn genérica en `globals.css`, paleta Quintas en `tailwind.config.ts`, y paleta slate en los layouts.

#### A.1 — Actualizar `globals.css` con tokens HSL del UI_UX_ROADMAP

**Archivo:** `frontend/app/globals.css`

Reemplazar las variables CSS actuales (paleta shadcn genérica) con los tokens del documento `UI_UX_ROADMAP.md`:

```css
/* ANTES (paleta genérica shadcn) */
:root {
  --primary: 222.2 47.4% 11.2%;
  --background: 0 0% 100%;
  /* ... */
}

/* DESPUÉS (paleta Quintas — light-only) */
:root {
  /* Primary: Verde Pino */
  --primary:        158 25% 22%;   /* hsl → #1E3A33 */
  --primary-light:  158 20% 35%;
  --primary-dark:   158 30% 15%;
  --primary-foreground: 40 40% 97%;

  /* Secondary: Marrón Corteza */
  --secondary:      26 30% 33%;    /* hsl → #6B4F3B */
  --secondary-light: 26 25% 45%;
  --secondary-dark:  26 35% 22%;
  --secondary-foreground: 40 40% 97%;

  /* Accent: Dorado */
  --accent:         43 86% 55%;    /* hsl → #F2C14E */
  --accent-foreground: 210 13% 11%;

  /* Surface / Background */
  --background:     40 40% 97%;    /* hsl → #FAF6EF (Marfil) */
  --foreground:     210 13% 11%;   /* hsl → #111827 */

  /* Card */
  --card:           0 0% 100%;
  --card-foreground: 210 13% 11%;

  /* Muted */
  --muted:          40 20% 93%;
  --muted-foreground: 215 10% 45%;

  /* Border / Input */
  --border:         40 15% 85%;
  --input:          40 15% 85%;
  --ring:           158 25% 22%;

  /* Destructive */
  --destructive:    0 72% 51%;
  --destructive-foreground: 0 0% 100%;

  /* Status semánticos */
  --status-disponible: 82 28% 35%;   /* Verde Oliva */
  --status-apartado:   43 72% 45%;   /* Dorado */
  --status-vendido:    0 55% 35%;    /* Vino */
  --status-liquidado:  213 45% 35%;  /* Azul marino */

  /* Radius */
  --radius: 0.5rem;

  /* Sombras */
  --shadow-warm:      0 4px 14px 0 rgba(30, 58, 51, 0.12);
  --shadow-card:      0 2px 8px 0 rgba(30, 58, 51, 0.07);
  --shadow-hover:     0 6px 20px 0 rgba(30, 58, 51, 0.20);
}
```

#### A.2 — Actualizar `app/layout.tsx` — App Shell Light

**Archivo:** `frontend/app/layout.tsx`

```tsx
// ANTES
<body className="min-h-screen antialiased bg-slate-950 text-slate-50">

// DESPUÉS
<body className="min-h-screen antialiased bg-background text-foreground font-sans">
```

#### A.3 — Actualizar `app/dashboard/layout.tsx` — Sidebar con tokens Quintas

```tsx
// ANTES: bg-slate-900, border-slate-800, text-slate-400, bg-emerald-500/10 text-emerald-400
// DESPUÉS: bg-card, border-border, text-muted-foreground, bg-primary/10 text-primary
```

#### A.4 — Actualizar `components/layout/Navbar.tsx` — Topbar con paleta Quintas

```tsx
// ANTES: border-slate-800 bg-slate-900/50
// DESPUÉS: border-border bg-card/80 backdrop-blur-md
```

#### A.5 — Exportar Design Tokens a JSON y CSS Variables

Crear archivo `frontend/lib/tokens.ts` con los tokens como constantes TypeScript para uso programático (Recharts, animaciones, etc.):

```typescript
export const tokens = {
  colors: {
    primary:   'hsl(158 25% 22%)',
    secondary: 'hsl(26 30% 33%)',
    accent:    'hsl(43 86% 55%)',
    surface:   'hsl(40 40% 97%)',
    // ...
  },
  // ...
} as const;
```

Crear `frontend/public/tokens.json` para referencia de agentes y herramientas externas.

#### A.6 — Token Playground (Página de revisión)

Crear `frontend/app/developer-portal/tokens/page.tsx` — página interna que muestra:
- Swatches de todos los colores con contraste WCAG
- Tipografía (serif branding + sans UI)
- Sombras y radios
- Estados de componentes (hover, focus, disabled, error)

**Definition of Done (A):**
- [ ] `globals.css` usa paleta Quintas HSL completa
- [ ] App Shell (layout, navbar, sidebar) usa tokens `bg-background`, `bg-card`, `border-border`, `text-foreground`
- [ ] Contraste WCAG AA verificado en todos los textos principales
- [ ] `tokens.ts` y `tokens.json` exportados
- [ ] Token Playground accesible en `/developer-portal/tokens`

---

### 🧩 FASE B: Completar Wizard de Venta (6 Pasos)

**Objetivo:** Completar el flujo de venta con los 2 pasos faltantes: documentos/firma y confirmación final con recibo.

**Estado actual:** 4 pasos implementados (`Step1` → `Step4Confirmacion`)
**Faltante:** Paso 5 (Documentos y Firma) + Paso 6 (Confirmación Final + Recibo PDF)

#### B.1 — Paso 5: Documentos y Firma Digital

**Archivo nuevo:** `frontend/components/wizard/Step5Documentos.tsx`

Funcionalidades:
- Checklist de documentos requeridos (INE, comprobante domicilio, RFC)
- Upload de archivos a Directus (`/files`)
- Campo de firma digital (canvas HTML5 o integración con firma electrónica)
- Validación: no avanzar sin documentos mínimos

```typescript
// Integración con Directus Files API
const uploadDocumento = async (file: File, tipo: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', ventaId);
  const response = await directusClient.post('/files', formData);
  return response.data.data.id;
};
```

#### B.2 — Paso 6: Confirmación Final + Recibo PDF

**Archivo nuevo:** `frontend/components/wizard/Step6Confirmacion.tsx`

Funcionalidades:
- Resumen completo de la venta (lote, cliente, términos, documentos)
- Generación de recibo PDF con `jspdf` + `jspdf-autotable` (ya instalados)
- Envío de email de confirmación vía Directus hook
- Botón "Finalizar y crear venta" que llama a `createVenta()`
- Limpieza del estado del wizard en localStorage

#### B.3 — Actualizar `WizardVenta.tsx` — Barra de progreso y navegación

```tsx
// Actualizar INITIAL_STATE
const INITIAL_STATE: WizardState = {
  currentStep: 1,  // 1-6
  loteSeleccionado: null,
  cliente: null,
  terminos: null,
  documentos: null,  // NUEVO
  confirmado: false, // NUEVO
};

// Barra de progreso visual con 6 pasos y labels
const STEPS = [
  { id: 1, label: 'Lote', icon: Map },
  { id: 2, label: 'Cliente', icon: User },
  { id: 3, label: 'Términos', icon: FileText },
  { id: 4, label: 'Revisión', icon: Eye },
  { id: 5, label: 'Documentos', icon: Upload },
  { id: 6, label: 'Confirmar', icon: CheckCircle },
];
```

#### B.4 — Autosave mejorado con validación progresiva

- Validar cada paso antes de permitir avanzar (Zod schemas por paso)
- Indicador visual de "Guardado automáticamente" con timestamp
- Recuperación de sesión: si el usuario cierra y vuelve, mostrar modal "¿Continuar venta anterior?"

**Definition of Done (B):**
- [ ] 6 pasos completos con navegación fluida
- [ ] Barra de progreso visual con estado de cada paso
- [ ] Upload de documentos funcional a Directus
- [ ] Recibo PDF generado y descargable
- [ ] Autosave con indicador visual
- [ ] Modal de recuperación de sesión

---

### 👤 FASE C: Customer 360 — Vista de Cliente Enriquecida

**Objetivo:** Transformar `/clientes/[id]` de un formulario básico a una vista de decisión en 5 segundos.

**Estado actual:** Formulario con 2 tabs (info/ventas), sin KPIs ni timeline.

#### C.1 — Ribbon de Estado (Header)

```tsx
// Componente: components/clientes/ClienteRibbon.tsx
// Muestra: Avatar/iniciales, nombre completo, badge de estatus,
// fecha de alta, vendedor asignado, y 3 acciones primarias:
// [Nueva Venta] [Registrar Pago] [Enviar Mensaje]
```

#### C.2 — KPIs del Cliente (4 métricas clave)

```tsx
// Componente: components/clientes/ClienteKPIs.tsx
// Métricas:
// - Total invertido (suma de monto_total de sus ventas)
// - Pagos al corriente (% de pagos en estatus 'pagado')
// - Próximo pago (fecha y monto del siguiente pago pendiente)
// - Lotes activos (count de ventas no canceladas)
```

#### C.3 — Timeline de Actividad

```tsx
// Componente: components/clientes/ClienteTimeline.tsx
// Eventos cronológicos:
// - Fecha de registro
// - Cada venta realizada
// - Cada pago registrado
// - Documentos subidos
// - Notas del vendedor
```

#### C.4 — Panel de Acciones Rápidas

```tsx
// Componente: components/clientes/ClienteAcciones.tsx
// Acciones:
// - Registrar pago manual
// - Generar estado de cuenta PDF
// - Enviar recordatorio de pago (email)
// - Agregar nota interna
// - Ver en mapa (highlight del lote)
```

#### C.5 — Actualizar `/clientes/[id]/page.tsx`

Reorganizar la página con layout de 3 columnas:
- Columna izquierda (30%): Ribbon + KPIs + Acciones
- Columna central (45%): Timeline + Historial de pagos
- Columna derecha (25%): Documentos + Notas

**Definition of Done (C):**
- [ ] Ribbon con estado y acciones primarias visibles en < 2s
- [ ] 4 KPIs calculados desde datos reales de Directus
- [ ] Timeline cronológico con todos los eventos del cliente
- [ ] Acciones rápidas funcionales (pago, PDF, nota)
- [ ] Layout responsive (3 cols desktop → 1 col mobile)

---

### ⌨️ FASE D: Command Palette (Ctrl/⌘+K)

**Objetivo:** Navegación global rápida para usuarios de escritorio (vendedores y admins).

#### D.1 — Componente `CommandPalette`

**Archivo nuevo:** `frontend/components/layout/CommandPalette.tsx`

```tsx
// Funcionalidades:
// - Activar con Ctrl+K / Cmd+K
// - Búsqueda de clientes por nombre/email/RFC
// - Búsqueda de lotes por número/manzana
// - Búsqueda de ventas por folio
// - Acciones rápidas: "Nueva venta", "Registrar pago", "Ver mapa"
// - Navegación a secciones del dashboard
// - Historial de búsquedas recientes (localStorage)
```

#### D.2 — Integración con `app/layout.tsx`

```tsx
// Agregar al RootLayout:
import { CommandPalette } from '@/components/layout/CommandPalette';
// Renderizar junto al Navbar, fuera del flujo principal
```

#### D.3 — Hook `useCommandPalette`

**Archivo nuevo:** `frontend/hooks/useCommandPalette.ts`

```typescript
// Estado global del palette (open/closed, query, results)
// Keyboard shortcut listener (Ctrl+K / Cmd+K)
// Búsqueda debounced contra APIs de clientes, lotes, ventas
```

**Definition of Done (D):**
- [ ] Ctrl+K abre el palette en cualquier página
- [ ] Búsqueda de clientes, lotes y ventas en tiempo real
- [ ] Acciones rápidas ejecutables desde el palette
- [ ] Historial de búsquedas recientes
- [ ] Accesible (ARIA, focus trap, Escape para cerrar)

---

### 📱 FASE E: Sidebar Responsive + Mobile Navigation

**Objetivo:** El sidebar de `/dashboard` actualmente está oculto en móvil (`hidden md:block`) sin alternativa.

#### E.1 — Mobile Drawer para Dashboard Sidebar

**Archivo nuevo:** `frontend/components/layout/MobileSidebarDrawer.tsx`

```tsx
// Drawer lateral que se abre con botón hamburguesa en Navbar
// Mismo contenido que el sidebar desktop
// Overlay con backdrop-blur al abrir
// Cierre con swipe o click fuera
```

#### E.2 — Actualizar `Navbar.tsx` — Botón hamburguesa en móvil

```tsx
// Agregar botón hamburguesa visible solo en md:hidden
// Conectar con estado global del drawer (Zustand o Context)
```

#### E.3 — Actualizar `app/dashboard/layout.tsx`

```tsx
// Integrar MobileSidebarDrawer
// Mantener sidebar desktop existente
// Pasar estado open/close al drawer
```

#### E.4 — Bottom Navigation para Portal de Clientes (móvil)

**Archivo nuevo:** `frontend/components/portal/BottomNav.tsx`

```tsx
// Barra de navegación inferior para /portal en móvil
// Items: Inicio, Mis Pagos, Documentos, Perfil
// Visible solo en sm:block md:hidden
```

**Definition of Done (E):**
- [ ] Drawer funcional en móvil para `/dashboard`
- [ ] Botón hamburguesa en Navbar (solo móvil)
- [ ] Bottom nav en Portal de Clientes (solo móvil)
- [ ] Sin layout shift al abrir/cerrar drawer

---

### ⚡ FASE F: Tiempo Real con Directus WebSocket

**Objetivo:** Aprovechar `WEBSOCKETS_ENABLED: true` ya configurado en Docker para sincronización en tiempo real.

**Estado actual:** WebSocket habilitado en backend pero NO consumido en frontend. Solo hay polling con `setInterval` (30s) y `BroadcastChannel` entre tabs.

#### F.1 — Hook `useDirectusRealtime`

**Archivo nuevo:** `frontend/hooks/useDirectusRealtime.ts`

```typescript
import { useEffect, useRef, useCallback } from 'react';

interface RealtimeOptions {
  collection: string;
  event?: 'create' | 'update' | 'delete' | '*';
  filter?: Record<string, unknown>;
  onMessage: (data: unknown) => void;
}

export function useDirectusRealtime({ collection, event = '*', onMessage }: RealtimeOptions) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const DIRECTUS_WS = process.env.NEXT_PUBLIC_DIRECTUS_URL
      ?.replace('http', 'ws') + '/websocket';

    const ws = new WebSocket(DIRECTUS_WS);
    wsRef.current = ws;

    ws.onopen = () => {
      // Autenticar con token
      ws.send(JSON.stringify({ type: 'auth', access_token: token }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'subscription' && data.event === 'init') {
        // Suscribirse a la colección
        ws.send(JSON.stringify({
          type: 'subscribe',
          collection,
          event,
        }));
      }
      if (data.type === 'subscription') {
        onMessage(data);
      }
    };

    return () => ws.close();
  }, [collection, event]);
}
```

#### F.2 — Integrar en Dashboard Principal

```tsx
// En DashboardPrincipal.tsx:
useDirectusRealtime({
  collection: 'ventas',
  event: 'create',
  onMessage: () => loadDashboardData(true), // Silent refresh
});

useDirectusRealtime({
  collection: 'pagos',
  event: 'update',
  onMessage: () => loadDashboardData(true),
});
```

#### F.3 — Integrar en Mapa SVG

```tsx
// En MapaSVGInteractivo.tsx:
useDirectusRealtime({
  collection: 'lotes',
  event: 'update',
  onMessage: (data) => {
    // UI optimista: actualizar estatus del lote sin recargar todo
    setLotes(prev => prev.map(l =>
      l.properties.id === data.data.id
        ? { ...l, properties: { ...l.properties, estatus: data.data.estatus } }
        : l
    ));
  },
});
```

#### F.4 — Indicador de conexión en tiempo real

```tsx
// Componente: components/layout/RealtimeIndicator.tsx
// Punto verde pulsante en Navbar cuando WebSocket está conectado
// Tooltip: "Datos en tiempo real · Última actualización: hace 2s"
```

**Definition of Done (F):**
- [ ] Hook `useDirectusRealtime` funcional con auth
- [ ] Dashboard actualiza KPIs automáticamente al crear venta/pago
- [ ] Mapa actualiza estatus de lotes en tiempo real
- [ ] Indicador visual de conexión WebSocket en Navbar
- [ ] Reconexión automática con backoff exponencial

---

### 🔔 FASE G: Sistema de Notificaciones (Inbox Persistente)

**Objetivo:** Complementar los toasts de Sonner con un inbox persistente de notificaciones.

**Estado actual:** Solo toasts efímeros con Sonner. No hay historial de notificaciones.

#### G.1 — Tabla `notificaciones` en Directus

```sql
-- Migración: 020_create_notificaciones.sql
CREATE TABLE notificaciones (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     CHAR(36) NOT NULL,
  tipo        ENUM('pago_vencido','nueva_venta','pago_recibido','sistema') NOT NULL,
  titulo      VARCHAR(255) NOT NULL,
  mensaje     TEXT,
  leida       BOOLEAN DEFAULT FALSE,
  url_accion  VARCHAR(500),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_leida (user_id, leida)
);
```

#### G.2 — Componente `NotificationsInbox`

**Archivo nuevo:** `frontend/components/layout/NotificationsInbox.tsx`

```tsx
// Campana en Navbar con badge de no leídas
// Dropdown con lista de notificaciones
// Marcar como leída al hacer click
// Marcar todas como leídas
// Link a la acción relevante (venta, pago, cliente)
```

#### G.3 — Hook `useNotifications`

**Archivo nuevo:** `frontend/hooks/useNotifications.ts`

```typescript
// Polling cada 60s para nuevas notificaciones
// O WebSocket subscription a colección 'notificaciones'
// Estado: unreadCount, notifications[], markAsRead(), markAllAsRead()
```

#### G.4 — Triggers automáticos de notificaciones

En `extensions/directus-extension-hook-crm-logic/`:
- Pago vencido → notificación al vendedor asignado
- Nueva venta creada → notificación al admin
- Pago recibido → notificación al cliente (portal)

**Definition of Done (G):**
- [ ] Tabla `notificaciones` migrada y registrada en Directus
- [ ] Inbox en Navbar con badge de no leídas
- [ ] Notificaciones en tiempo real vía WebSocket
- [ ] Triggers automáticos para eventos clave
- [ ] Portal de clientes recibe notificaciones de pagos

---

### 📊 FASE H: Homogeneizar Consumo de KPIs (BFF Unificado)

**Objetivo:** Resolver la inconsistencia donde `Executive View` llama directamente a Directus (`/crm-analytics/kpis`) mientras el resto usa la capa BFF (`/api/dashboard/kpis`).

#### H.1 — Unificar en capa BFF

Actualizar `app/dashboard/page.tsx` para usar `fetchKPIs()` de `lib/dashboard-api.ts` en lugar de `directusClient.get('/crm-analytics/kpis')` directamente.

#### H.2 — Conectar "Comisiones pendientes" en Executive View

```tsx
// En app/dashboard/page.tsx:
// Actualmente: "No disponible"
// Después: kpis.comisiones_pendientes formateado con formatCurrencyMXN()
```

#### H.3 — Completar gráfico "Ventas por Zona"

En `app/dashboard/ventas/page.tsx`, el componente "Gráfico de Ventas por Zona" está como placeholder. Implementar:
- Query a Directus agrupando ventas por `lote_id.zona`
- Gráfico de barras horizontales con `recharts`

#### H.4 — Añadir endpoint `/api/dashboard/ventas-por-zona`

**Archivo nuevo:** `frontend/app/api/dashboard/ventas-por-zona/route.ts`

```typescript
// Query: SELECT lotes.zona, COUNT(*) as total, SUM(ventas.monto_total) as monto
// FROM ventas JOIN lotes ON ventas.lote_id = lotes.id
// GROUP BY lotes.zona
```

**Definition of Done (H):**
- [ ] Executive View usa BFF (`fetchKPIs`) como todos los demás dashboards
- [ ] "Comisiones pendientes" muestra dato real
- [ ] Gráfico "Ventas por Zona" implementado
- [ ] Endpoint `/api/dashboard/ventas-por-zona` funcional

---

### ⚙️ FASE I: Configuración Real del Sistema

**Objetivo:** La página `/dashboard/configuracion` es actualmente un placeholder estático.

#### I.1 — Perfil de Usuario

- Editar nombre, email, avatar (upload a Directus)
- Cambiar contraseña (llamada a `/users/me` de Directus)

#### I.2 — Configuración del Negocio

- Nombre del fraccionamiento, logo, dirección
- Tasas de interés por defecto para nuevas ventas
- Porcentaje de comisión por defecto para vendedores
- Configuración de Stripe (modo test/producción)

#### I.3 — Gestión de Usuarios y Roles

- Crear/editar/desactivar usuarios (Admin only)
- Asignar roles (Administrador/Vendedor/Cliente)
- Vincular usuario Directus con registro de cliente/vendedor

**Definition of Done (I):**
- [ ] Perfil de usuario editable con avatar
- [ ] Cambio de contraseña funcional
- [ ] Configuración del negocio persistida en Directus
- [ ] Gestión básica de usuarios (Admin only)

---

### 🧪 FASE J: Testing y Calidad

**Objetivo:** Ampliar la cobertura de tests existentes (Playwright e2e + Vitest unit).

#### J.1 — Tests E2E críticos (Playwright)

Archivos existentes en `frontend/tests/e2e/`:
- `wizard.spec.ts` — Completar con pasos 5 y 6
- `mapa.spec.ts` — Agregar tests de selección y filtros
- `dashboard.spec.ts` — Agregar tests de KPIs y gráficos
- **Nuevo:** `customer360.spec.ts` — Tests de vista de cliente
- **Nuevo:** `command-palette.spec.ts` — Tests de Ctrl+K

#### J.2 — Tests unitarios (Vitest)

- `lib/utils.test.ts` — `formatCurrencyMXN`, `formatNumberCompact`, `formatPercent`
- `lib/dashboard-api.test.ts` — Mocks de endpoints, manejo de 403
- `components/wizard/WizardVenta.test.tsx` — Autosave, navegación entre pasos
- `hooks/useDirectusRealtime.test.ts` — Conexión, reconexión, mensajes

#### J.3 — Accessibility Tests

Ampliar `tests/e2e/accessibility.spec.ts`:
- Contraste de colores con nueva paleta Quintas
- Navegación por teclado en Wizard y Command Palette
- ARIA labels en Mapa SVG (lotes como elementos interactivos)

**Definition of Done (J):**
- [ ] Cobertura E2E > 80% de flujos críticos
- [ ] Tests unitarios para utils y hooks
- [ ] 0 violaciones WCAG AA en páginas principales
- [ ] CI/CD pasa todos los tests antes de merge

---

## 📅 CRONOGRAMA SUGERIDO (8 Semanas)

```
Semana 1  │ FASE A (Design Tokens) + FASE H (BFF unificado)
Semana 2  │ FASE B (Wizard 6 pasos) — Steps 5 y 6
Semana 3  │ FASE C (Customer 360) — Ribbon + KPIs + Timeline
Semana 4  │ FASE D (Command Palette) + FASE E (Mobile Sidebar)
Semana 5  │ FASE F (WebSocket Tiempo Real) — Hook + Dashboard + Mapa
Semana 6  │ FASE G (Notificaciones Inbox) + FASE I (Configuración)
Semana 7  │ FASE H completar (Ventas por Zona) + Pulido visual
Semana 8  │ FASE J (Testing) + Documentación + Preparación producción
```

---

## 🔧 DEUDA TÉCNICA IDENTIFICADA

### Alta Prioridad

| Item | Archivo | Descripción |
|------|---------|-------------|
| `ignoreBuildErrors: true` | `next.config.mjs` | TypeScript errors ignorados en build. Debe resolverse antes de producción |
| `any` types | `dashboard/comisiones/page.tsx`, `dashboard/pagos/page.tsx` | Usar tipos de `types/dashboard.ts` |
| Filtro de pagos por venta | `ventas/[id]/page.tsx` | `fetchPagos()` trae TODOS los pagos y filtra en cliente. Debe filtrarse en servidor |
| Stats mock en Developer Portal | `developer-portal/page.tsx` | `requestsCount = 1250` y `errorRate = '0.5%'` son valores hardcodeados |
| `getServerSession(authOptions)` | `oauth/consent/page.tsx` | Usar `auth()` de NextAuth v5 en lugar de la API v4 |

### Media Prioridad

| Item | Archivo | Descripción |
|------|---------|-------------|
| Fuentes tipográficas | `app/layout.tsx` | No se cargan las fuentes serif (branding) + sans (UI) del Design System |
| `proj4` en devDependencies | `package.json` | Está en `dependencies` pero solo se usa para conversión UTM en `directus-api.ts` |
| Wizard state en localStorage | `WizardVenta.tsx` | Datos sensibles (cliente, términos) en localStorage sin cifrado |
| `redirect` en Home | `app/page.tsx` | Redirige siempre a `/portal/auth/login`. Debería redirigir según rol |

---

## 🏗️ ARQUITECTURA DE PRÓXIMOS COMPONENTES

```
frontend/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx              ← Actualizar: usar fetchKPIs() BFF
│   │   └── ventas/page.tsx       ← Completar: gráfico Ventas por Zona
│   └── developer-portal/
│       └── tokens/page.tsx       ← NUEVO: Token Playground
├── components/
│   ├── clientes/                 ← NUEVO directorio
│   │   ├── ClienteRibbon.tsx
│   │   ├── ClienteKPIs.tsx
│   │   ├── ClienteTimeline.tsx
│   │   └── ClienteAcciones.tsx
│   ├── layout/
│   │   ├── CommandPalette.tsx    ← NUEVO
│   │   ├── MobileSidebarDrawer.tsx ← NUEVO
│   │   ├── NotificationsInbox.tsx  ← NUEVO
│   │   └── RealtimeIndicator.tsx   ← NUEVO
│   ├── portal/
│   │   └── BottomNav.tsx         ← NUEVO
│   └── wizard/
│       ├── Step5Documentos.tsx   ← NUEVO
│       └── Step6Confirmacion.tsx ← NUEVO
├── hooks/
│   ├── useCommandPalette.ts      ← NUEVO
│   ├── useDirectusRealtime.ts    ← NUEVO
│   └── useNotifications.ts      ← NUEVO
├── lib/
│   └── tokens.ts                 ← NUEVO: Design tokens como constantes TS
└── public/
    └── tokens.json               ← NUEVO: Design tokens para herramientas externas
```

---

## 🎯 MÉTRICAS DE ÉXITO

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Consistencia visual (paleta Quintas) | ~30% | 100% |
| Pasos del Wizard | 4/6 | 6/6 |
| Latencia de actualización de datos | 30s (polling) | < 1s (WebSocket) |
| Cobertura de tests E2E | ~40% | > 80% |
| Errores TypeScript en build | Ignorados | 0 |
| Accesibilidad WCAG AA | No verificado | 100% páginas principales |
| Mobile UX (sidebar/nav) | Sin soporte | Completo |

---

## 📋 CHECKLIST DE INICIO INMEDIATO

Para comenzar la próxima sesión de desarrollo, ejecutar en orden:

```bash
# 1. Verificar estado del entorno
docker-compose up -d && docker-compose ps

# 2. Verificar que el frontend compila
cd frontend && npm run build 2>&1 | grep -E "error|warning" | head -20

# 3. Verificar tokens TypeScript pendientes
cd frontend && npx tsc --noEmit 2>&1 | head -30

# 4. Iniciar desarrollo
cd frontend && npm run dev
```

**Primera tarea recomendada:** Comenzar con **FASE A** (Design Tokens) ya que es la base visual de todo lo demás y tiene el mayor impacto visual inmediato con el menor riesgo de romper funcionalidad existente.

---

*Documento generado el: 2025 | Repositorio: nhadadn/quintas-crm | Rama: main*
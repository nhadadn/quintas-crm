<h1>🗺️ ROADMAP — QUINTAS DE OTINAPA CRM</h1><h2>Próximos Pasos: Análisis del Estado Actual y Plan de Acción</h2><blockquote> <p><strong>Fecha de análisis:</strong> Basado en revisión completa del repositorio <code>nhadadn/quintas-crm</code> (rama <code>main</code>) <strong>Versión actual:</strong> 0.4.0 <strong>Stack:</strong> Next.js 15 · Directus 10 · MySQL 8 · Redis · Stripe · NextAuth v5</p> </blockquote><hr><h2>📊 ESTADO ACTUAL DEL PROYECTO (Diagnóstico)</h2><h3>✅ Lo que YA está implementado y funcional</h3><table class="e-rte-table"> <thead> <tr> <th>Módulo</th> <th>Estado</th> <th>Notas</th> </tr> </thead> <tbody><tr> <td><strong>Auth (NextAuth v5)</strong></td> <td>✅ Completo</td> <td>Login, logout, recuperación de contraseña, roles (Admin/Vendedor/Cliente), RLS</td> </tr> <tr> <td><strong>Mapa SVG Interactivo</strong></td> <td>✅ Funcional</td> <td>Zoom/pan, selección de lotes, filtros, leyenda, panel de detalle, colores por estatus</td> </tr> <tr> <td><strong>Wizard de Venta (4 pasos)</strong></td> <td>✅ Funcional</td> <td>Selección lote → Datos cliente → Términos → Confirmación. Autosave en localStorage</td> </tr> <tr> <td><strong>Dashboard Analytics</strong></td> <td>✅ Funcional</td> <td>KPIs, gráficos Recharts, ventas por mes, ranking vendedores, pagos recientes</td> </tr> <tr> <td><strong>Gestión de Ventas</strong></td> <td>✅ Funcional</td> <td>CRUD, detalle con tabs (info/pagos/amortización)</td> </tr> <tr> <td><strong>Gestión de Pagos</strong></td> <td>✅ Funcional</td> <td>Tabla, modal registro, marcar pagado, descarga reporte</td> </tr> <tr> <td><strong>Gestión de Clientes</strong></td> <td>✅ Funcional</td> <td>CRUD, detalle con historial de ventas</td> </tr> <tr> <td><strong>Gestión de Vendedores</strong></td> <td>✅ Funcional</td> <td>CRUD, detalle con comisiones</td> </tr> <tr> <td><strong>Portal de Clientes</strong></td> <td>✅ Funcional</td> <td>Dashboard, historial pagos, documentos, Stripe payment</td> </tr> <tr> <td><strong>Comisiones</strong></td> <td>✅ Funcional</td> <td>Cálculo automático, tabla ranking, dashboard</td> </tr> <tr> <td><strong>Reportes</strong></td> <td>✅ Funcional</td> <td>Gráficos multi-tipo, filtros por fecha, exportación</td> </tr> <tr> <td><strong>Reembolsos</strong></td> <td>✅ Funcional</td> <td>Solicitud, aprobación/rechazo</td> </tr> <tr> <td><strong>Stripe Integration</strong></td> <td>✅ Funcional</td> <td>Payment Intent, suscripciones, webhooks</td> </tr> <tr> <td><strong>Developer Portal</strong></td> <td>✅ Funcional</td> <td>OAuth2, apps, webhooks, métricas</td> </tr> <tr> <td><strong>Docker / Infra</strong></td> <td>✅ Completo</td> <td>MySQL + Redis + Directus + Next.js, zero-config</td> </tr> <tr> <td><strong>Design System (Tailwind)</strong></td> <td>⚠️ Parcial</td> <td>Tokens definidos en <code>tailwind.config.ts</code> pero <code>globals.css</code> usa paleta genérica shadcn</td> </tr> <tr> <td><strong>Design Tokens HSL</strong></td> <td>⚠️ Pendiente</td> <td><code>UI_UX_ROADMAP.md</code> entregado pero NO aplicado al código</td> </tr> </tbody></table><h3>⚠️ Brechas Críticas Identificadas</h3><ol> <li><strong>Design Tokens no aplicados:</strong> <code>globals.css</code> usa la paleta genérica de shadcn/ui (azul-gris), no la paleta "Quintas" (verde pino + dorado + marfil) definida en <code>tailwind.config.ts</code> y en el <code>UI_UX_ROADMAP.md</code>.</li> <li><strong>Inconsistencia visual App Shell:</strong> <code>app/layout.tsx</code> usa <code>bg-slate-950 text-slate-50</code> (dark slate), mientras que el Design System define <code>Surface: hsl(40 40% 97%)</code> (marfil claro). El sistema es visualmente "oscuro" pero el DS pide "light-only".</li> <li><strong>Wizard de Venta incompleto:</strong> Solo 4 pasos implementados vs. 6 especificados en el roadmap UX (falta: Paso 5 - Documentos/Firma, Paso 6 - Confirmación final con recibo).</li> <li><strong>Customer 360 ausente:</strong> La vista de detalle de cliente (<code>/clientes/[id]</code>) es un formulario básico, no el "Customer 360" con ribbon de estado, KPIs, timeline y acciones primarias especificado.</li> <li><strong>Command Palette (Ctrl+K) no implementado.</strong></li> <li><strong>Sidebar responsive/mobile drawer ausente</strong> en <code>/dashboard</code>.</li> <li><strong>Notificaciones (toasts + inbox)</strong> solo parcialmente implementadas (solo toasts con Sonner, sin inbox persistente).</li> <li><strong>Tiempo real Directus WebSocket</strong> configurado en <code>docker-compose.yml</code> (<code>WEBSOCKETS_ENABLED: true</code>) pero NO consumido en el frontend.</li> <li><strong><code>globals.css</code> no actualizado</strong> con los tokens HSL del <code>UI_UX_ROADMAP.md</code>.</li> <li><strong>Configuración page</strong> (<code>/dashboard/configuracion</code>) es un placeholder estático sin funcionalidad real.</li> </ol><hr><h2>🚀 ROADMAP DE PRÓXIMOS PASOS</h2><h3>PRIORIDAD CRÍTICA — Fundación Visual (Semana 1-2)</h3><hr><h3>🎨 FASE A: Aplicar Design System "Quintas" al Código</h3><p><strong>Objetivo:</strong> Unificar la identidad visual. Actualmente hay 3 paletas en conflicto: shadcn genérica en <code>globals.css</code>, paleta Quintas en <code>tailwind.config.ts</code>, y paleta slate en los layouts.</p><h4>A.1 — Actualizar <code>globals.css</code> con tokens HSL del UI_UX_ROADMAP</h4><p><strong>Archivo:</strong> <code>frontend/app/globals.css</code></p><p>Reemplazar las variables CSS actuales (paleta shadcn genérica) con los tokens del documento <code>UI_UX_ROADMAP.md</code>:</p><pre><code class="language-css">/* ANTES (paleta genérica shadcn) */
:root {
  --primary: 222.2 47.4% 11.2%;
  --background: 0 0% 100%;
  /* ... */
}

/_ DESPUÉS (paleta Quintas — light-only) _/
:root {
/_ Primary: Verde Pino _/
--primary: 158 25% 22%; /_ hsl → #1E3A33 _/
--primary-light: 158 20% 35%;
--primary-dark: 158 30% 15%;
--primary-foreground: 40 40% 97%;

/_ Secondary: Marrón Corteza _/
--secondary: 26 30% 33%; /_ hsl → #6B4F3B _/
--secondary-light: 26 25% 45%;
--secondary-dark: 26 35% 22%;
--secondary-foreground: 40 40% 97%;

/_ Accent: Dorado _/
--accent: 43 86% 55%; /_ hsl → #F2C14E _/
--accent-foreground: 210 13% 11%;

/_ Surface / Background _/
--background: 40 40% 97%; /_ hsl → #FAF6EF (Marfil) _/
--foreground: 210 13% 11%; /_ hsl → #111827 _/

/_ Card _/
--card: 0 0% 100%;
--card-foreground: 210 13% 11%;

/_ Muted _/
--muted: 40 20% 93%;
--muted-foreground: 215 10% 45%;

/_ Border / Input _/
--border: 40 15% 85%;
--input: 40 15% 85%;
--ring: 158 25% 22%;

/_ Destructive _/
--destructive: 0 72% 51%;
--destructive-foreground: 0 0% 100%;

/_ Status semánticos _/
--status-disponible: 82 28% 35%; /_ Verde Oliva _/
--status-apartado: 43 72% 45%; /_ Dorado _/
--status-vendido: 0 55% 35%; /_ Vino _/
--status-liquidado: 213 45% 35%; /_ Azul marino _/

/_ Radius _/
--radius: 0.5rem;

/_ Sombras _/
--shadow-warm: 0 4px 14px 0 rgba(30, 58, 51, 0.12);
--shadow-card: 0 2px 8px 0 rgba(30, 58, 51, 0.07);
--shadow-hover: 0 6px 20px 0 rgba(30, 58, 51, 0.20);
}
</code></pre><h4>A.2 — Actualizar <code>app/layout.tsx</code> — App Shell Light</h4><p><strong>Archivo:</strong> <code>frontend/app/layout.tsx</code></p><pre><code class="language-tsx">// ANTES
&lt;body className="min-h-screen antialiased bg-slate-950 text-slate-50"&gt;

// DESPUÉS
&lt;body className="min-h-screen antialiased bg-background text-foreground font-sans"&gt;
</code></pre><h4>A.3 — Actualizar <code>app/dashboard/layout.tsx</code> — Sidebar con tokens Quintas</h4><pre><code class="language-tsx">// ANTES: bg-slate-900, border-slate-800, text-slate-400, bg-emerald-500/10 text-emerald-400
// DESPUÉS: bg-card, border-border, text-muted-foreground, bg-primary/10 text-primary
</code></pre><h4>A.4 — Actualizar <code>components/layout/Navbar.tsx</code> — Topbar con paleta Quintas</h4><pre><code class="language-tsx">// ANTES: border-slate-800 bg-slate-900/50
// DESPUÉS: border-border bg-card/80 backdrop-blur-md
</code></pre><h4>A.5 — Exportar Design Tokens a JSON y CSS Variables</h4><p>Crear archivo <code>frontend/lib/tokens.ts</code> con los tokens como constantes TypeScript para uso programático (Recharts, animaciones, etc.):</p><pre><code class="language-typescript">export const tokens = {
colors: {
primary: 'hsl(158 25% 22%)',
secondary: 'hsl(26 30% 33%)',
accent: 'hsl(43 86% 55%)',
surface: 'hsl(40 40% 97%)',
// ...
},
// ...
} as const;
</code></pre><p>Crear <code>frontend/public/tokens.json</code> para referencia de agentes y herramientas externas.</p><h4>A.6 — Token Playground (Página de revisión)</h4><p>Crear <code>frontend/app/developer-portal/tokens/page.tsx</code> — página interna que muestra:</p><ul> <li>Swatches de todos los colores con contraste WCAG</li> <li>Tipografía (serif branding + sans UI)</li> <li>Sombras y radios</li> <li>Estados de componentes (hover, focus, disabled, error)</li> </ul><p><strong>Definition of Done (A):</strong></p><ul> <li><input disabled="" type="checkbox"> <code>globals.css</code> usa paleta Quintas HSL completa</li> <li><input disabled="" type="checkbox"> App Shell (layout, navbar, sidebar) usa tokens <code>bg-background</code>, <code>bg-card</code>, <code>border-border</code>, <code>text-foreground</code></li> <li><input disabled="" type="checkbox"> Contraste WCAG AA verificado en todos los textos principales</li> <li><input disabled="" type="checkbox"> <code>tokens.ts</code> y <code>tokens.json</code> exportados</li> <li><input disabled="" type="checkbox"> Token Playground accesible en <code>/developer-portal/tokens</code></li> </ul><hr><h3>🧩 FASE B: Completar Wizard de Venta (6 Pasos)</h3><p><strong>Objetivo:</strong> Completar el flujo de venta con los 2 pasos faltantes: documentos/firma y confirmación final con recibo.</p><p><strong>Estado actual:</strong> 4 pasos implementados (<code>Step1</code> → <code>Step4Confirmacion</code>) <strong>Faltante:</strong> Paso 5 (Documentos y Firma) + Paso 6 (Confirmación Final + Recibo PDF)</p><h4>B.1 — Paso 5: Documentos y Firma Digital</h4><p><strong>Archivo nuevo:</strong> <code>frontend/components/wizard/Step5Documentos.tsx</code></p><p>Funcionalidades:</p><ul> <li>Checklist de documentos requeridos (INE, comprobante domicilio, RFC)</li> <li>Upload de archivos a Directus (<code>/files</code>)</li> <li>Campo de firma digital (canvas HTML5 o integración con firma electrónica)</li> <li>Validación: no avanzar sin documentos mínimos</li> </ul><pre><code class="language-typescript">// Integración con Directus Files API
const uploadDocumento = async (file: File, tipo: string) =&gt; {
const formData = new FormData();
formData.append('file', file);
formData.append('folder', ventaId);
const response = await directusClient.post('/files', formData);
return response.data.data.id;
};
</code></pre><h4>B.2 — Paso 6: Confirmación Final + Recibo PDF</h4><p><strong>Archivo nuevo:</strong> <code>frontend/components/wizard/Step6Confirmacion.tsx</code></p><p>Funcionalidades:</p><ul> <li>Resumen completo de la venta (lote, cliente, términos, documentos)</li> <li>Generación de recibo PDF con <code>jspdf</code> + <code>jspdf-autotable</code> (ya instalados)</li> <li>Envío de email de confirmación vía Directus hook</li> <li>Botón "Finalizar y crear venta" que llama a <code>createVenta()</code></li> <li>Limpieza del estado del wizard en localStorage</li> </ul><h4>B.3 — Actualizar <code>WizardVenta.tsx</code> — Barra de progreso y navegación</h4><pre><code class="language-tsx">// Actualizar INITIAL_STATE
const INITIAL_STATE: WizardState = {
currentStep: 1, // 1-6
loteSeleccionado: null,
cliente: null,
terminos: null,
documentos: null, // NUEVO
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
</code></pre><h4>B.4 — Autosave mejorado con validación progresiva</h4><ul> <li>Validar cada paso antes de permitir avanzar (Zod schemas por paso)</li> <li>Indicador visual de "Guardado automáticamente" con timestamp</li> <li>Recuperación de sesión: si el usuario cierra y vuelve, mostrar modal "¿Continuar venta anterior?"</li> </ul><p><strong>Definition of Done (B):</strong></p><ul> <li><input disabled="" type="checkbox"> 6 pasos completos con navegación fluida</li> <li><input disabled="" type="checkbox"> Barra de progreso visual con estado de cada paso</li> <li><input disabled="" type="checkbox"> Upload de documentos funcional a Directus</li> <li><input disabled="" type="checkbox"> Recibo PDF generado y descargable</li> <li><input disabled="" type="checkbox"> Autosave con indicador visual</li> <li><input disabled="" type="checkbox"> Modal de recuperación de sesión</li> </ul><hr><h3>👤 FASE C: Customer 360 — Vista de Cliente Enriquecida</h3><p><strong>Objetivo:</strong> Transformar <code>/clientes/[id]</code> de un formulario básico a una vista de decisión en 5 segundos.</p><p><strong>Estado actual:</strong> Formulario con 2 tabs (info/ventas), sin KPIs ni timeline.</p><h4>C.1 — Ribbon de Estado (Header)</h4><pre><code class="language-tsx">// Componente: components/clientes/ClienteRibbon.tsx
// Muestra: Avatar/iniciales, nombre completo, badge de estatus,
// fecha de alta, vendedor asignado, y 3 acciones primarias:
// [Nueva Venta] [Registrar Pago] [Enviar Mensaje]
</code></pre><h4>C.2 — KPIs del Cliente (4 métricas clave)</h4><pre><code class="language-tsx">// Componente: components/clientes/ClienteKPIs.tsx
// Métricas:
// - Total invertido (suma de monto_total de sus ventas)
// - Pagos al corriente (% de pagos en estatus 'pagado')
// - Próximo pago (fecha y monto del siguiente pago pendiente)
// - Lotes activos (count de ventas no canceladas)
</code></pre><h4>C.3 — Timeline de Actividad</h4><pre><code class="language-tsx">// Componente: components/clientes/ClienteTimeline.tsx
// Eventos cronológicos:
// - Fecha de registro
// - Cada venta realizada
// - Cada pago registrado
// - Documentos subidos
// - Notas del vendedor
</code></pre><h4>C.4 — Panel de Acciones Rápidas</h4><pre><code class="language-tsx">// Componente: components/clientes/ClienteAcciones.tsx
// Acciones:
// - Registrar pago manual
// - Generar estado de cuenta PDF
// - Enviar recordatorio de pago (email)
// - Agregar nota interna
// - Ver en mapa (highlight del lote)
</code></pre><h4>C.5 — Actualizar <code>/clientes/[id]/page.tsx</code></h4><p>Reorganizar la página con layout de 3 columnas:</p><ul> <li>Columna izquierda (30%): Ribbon + KPIs + Acciones</li> <li>Columna central (45%): Timeline + Historial de pagos</li> <li>Columna derecha (25%): Documentos + Notas</li> </ul><p><strong>Definition of Done (C):</strong></p><ul> <li><input disabled="" type="checkbox"> Ribbon con estado y acciones primarias visibles en &lt; 2s</li> <li><input disabled="" type="checkbox"> 4 KPIs calculados desde datos reales de Directus</li> <li><input disabled="" type="checkbox"> Timeline cronológico con todos los eventos del cliente</li> <li><input disabled="" type="checkbox"> Acciones rápidas funcionales (pago, PDF, nota)</li> <li><input disabled="" type="checkbox"> Layout responsive (3 cols desktop → 1 col mobile)</li> </ul><hr><h3>⌨️ FASE D: Command Palette (Ctrl/⌘+K)</h3><p><strong>Objetivo:</strong> Navegación global rápida para usuarios de escritorio (vendedores y admins).</p><h4>D.1 — Componente <code>CommandPalette</code></h4><p><strong>Archivo nuevo:</strong> <code>frontend/components/layout/CommandPalette.tsx</code></p><pre><code class="language-tsx">// Funcionalidades:
// - Activar con Ctrl+K / Cmd+K
// - Búsqueda de clientes por nombre/email/RFC
// - Búsqueda de lotes por número/manzana
// - Búsqueda de ventas por folio
// - Acciones rápidas: "Nueva venta", "Registrar pago", "Ver mapa"
// - Navegación a secciones del dashboard
// - Historial de búsquedas recientes (localStorage)
</code></pre><h4>D.2 — Integración con <code>app/layout.tsx</code></h4><pre><code class="language-tsx">// Agregar al RootLayout:
import { CommandPalette } from '@/components/layout/CommandPalette';
// Renderizar junto al Navbar, fuera del flujo principal
</code></pre><h4>D.3 — Hook <code>useCommandPalette</code></h4><p><strong>Archivo nuevo:</strong> <code>frontend/hooks/useCommandPalette.ts</code></p><pre><code class="language-typescript">// Estado global del palette (open/closed, query, results)
// Keyboard shortcut listener (Ctrl+K / Cmd+K)
// Búsqueda debounced contra APIs de clientes, lotes, ventas
</code></pre><p><strong>Definition of Done (D):</strong></p><ul> <li><input disabled="" type="checkbox"> Ctrl+K abre el palette en cualquier página</li> <li><input disabled="" type="checkbox"> Búsqueda de clientes, lotes y ventas en tiempo real</li> <li><input disabled="" type="checkbox"> Acciones rápidas ejecutables desde el palette</li> <li><input disabled="" type="checkbox"> Historial de búsquedas recientes</li> <li><input disabled="" type="checkbox"> Accesible (ARIA, focus trap, Escape para cerrar)</li> </ul><hr><h3>📱 FASE E: Sidebar Responsive + Mobile Navigation</h3><p><strong>Objetivo:</strong> El sidebar de <code>/dashboard</code> actualmente está oculto en móvil (<code>hidden md:block</code>) sin alternativa.</p><h4>E.1 — Mobile Drawer para Dashboard Sidebar</h4><p><strong>Archivo nuevo:</strong> <code>frontend/components/layout/MobileSidebarDrawer.tsx</code></p><pre><code class="language-tsx">// Drawer lateral que se abre con botón hamburguesa en Navbar
// Mismo contenido que el sidebar desktop
// Overlay con backdrop-blur al abrir
// Cierre con swipe o click fuera
</code></pre><h4>E.2 — Actualizar <code>Navbar.tsx</code> — Botón hamburguesa en móvil</h4><pre><code class="language-tsx">// Agregar botón hamburguesa visible solo en md:hidden
// Conectar con estado global del drawer (Zustand o Context)
</code></pre><h4>E.3 — Actualizar <code>app/dashboard/layout.tsx</code></h4><pre><code class="language-tsx">// Integrar MobileSidebarDrawer
// Mantener sidebar desktop existente
// Pasar estado open/close al drawer
</code></pre><h4>E.4 — Bottom Navigation para Portal de Clientes (móvil)</h4><p><strong>Archivo nuevo:</strong> <code>frontend/components/portal/BottomNav.tsx</code></p><pre><code class="language-tsx">// Barra de navegación inferior para /portal en móvil
// Items: Inicio, Mis Pagos, Documentos, Perfil
// Visible solo en sm:block md:hidden
</code></pre><p><strong>Definition of Done (E):</strong></p><ul> <li><input disabled="" type="checkbox"> Drawer funcional en móvil para <code>/dashboard</code></li> <li><input disabled="" type="checkbox"> Botón hamburguesa en Navbar (solo móvil)</li> <li><input disabled="" type="checkbox"> Bottom nav en Portal de Clientes (solo móvil)</li> <li><input disabled="" type="checkbox"> Sin layout shift al abrir/cerrar drawer</li> </ul><hr><h3>⚡ FASE F: Tiempo Real con Directus WebSocket</h3><p><strong>Objetivo:</strong> Aprovechar <code>WEBSOCKETS_ENABLED: true</code> ya configurado en Docker para sincronización en tiempo real.</p><p><strong>Estado actual:</strong> WebSocket habilitado en backend pero NO consumido en frontend. Solo hay polling con <code>setInterval</code> (30s) y <code>BroadcastChannel</code> entre tabs.</p><h4>F.1 — Hook <code>useDirectusRealtime</code></h4><p><strong>Archivo nuevo:</strong> <code>frontend/hooks/useDirectusRealtime.ts</code></p><pre><code class="language-typescript">import { useEffect, useRef, useCallback } from 'react';

interface RealtimeOptions {
collection: string;
event?: 'create' | 'update' | 'delete' | '\*';
filter?: Record&lt;string, unknown&gt;;
onMessage: (data: unknown) =&gt; void;
}

export function useDirectusRealtime({ collection, event = '\*', onMessage }: RealtimeOptions) {
const wsRef = useRef&lt;WebSocket | null&gt;(null);

useEffect(() =&gt; {
const DIRECTUS_WS = process.env.NEXT_PUBLIC_DIRECTUS_URL
?.replace('http', 'ws') + '/websocket';

    const ws = new WebSocket(DIRECTUS_WS);
    wsRef.current = ws;

    ws.onopen = () =&gt; {
      // Autenticar con token
      ws.send(JSON.stringify({ type: 'auth', access_token: token }));
    };

    ws.onmessage = (event) =&gt; {
      const data = JSON.parse(event.data);
      if (data.type === 'subscription' &amp;&amp; data.event === 'init') {
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

    return () =&gt; ws.close();

}, [collection, event]);
}
</code></pre><h4>F.2 — Integrar en Dashboard Principal</h4><pre><code class="language-tsx">// En DashboardPrincipal.tsx:
useDirectusRealtime({
collection: 'ventas',
event: 'create',
onMessage: () =&gt; loadDashboardData(true), // Silent refresh
});

useDirectusRealtime({
collection: 'pagos',
event: 'update',
onMessage: () =&gt; loadDashboardData(true),
});
</code></pre><h4>F.3 — Integrar en Mapa SVG</h4><pre><code class="language-tsx">// En MapaSVGInteractivo.tsx:
useDirectusRealtime({
collection: 'lotes',
event: 'update',
onMessage: (data) =&gt; {
// UI optimista: actualizar estatus del lote sin recargar todo
setLotes(prev =&gt; prev.map(l =&gt;
l.properties.id === data.data.id
? { ...l, properties: { ...l.properties, estatus: data.data.estatus } }
: l
));
},
});
</code></pre><h4>F.4 — Indicador de conexión en tiempo real</h4><pre><code class="language-tsx">// Componente: components/layout/RealtimeIndicator.tsx
// Punto verde pulsante en Navbar cuando WebSocket está conectado
// Tooltip: "Datos en tiempo real · Última actualización: hace 2s"
</code></pre><p><strong>Definition of Done (F):</strong></p><ul> <li><input disabled="" type="checkbox"> Hook <code>useDirectusRealtime</code> funcional con auth</li> <li><input disabled="" type="checkbox"> Dashboard actualiza KPIs automáticamente al crear venta/pago</li> <li><input disabled="" type="checkbox"> Mapa actualiza estatus de lotes en tiempo real</li> <li><input disabled="" type="checkbox"> Indicador visual de conexión WebSocket en Navbar</li> <li><input disabled="" type="checkbox"> Reconexión automática con backoff exponencial</li> </ul><hr><h3>🔔 FASE G: Sistema de Notificaciones (Inbox Persistente)</h3><p><strong>Objetivo:</strong> Complementar los toasts de Sonner con un inbox persistente de notificaciones.</p><p><strong>Estado actual:</strong> Solo toasts efímeros con Sonner. No hay historial de notificaciones.</p><h4>G.1 — Tabla <code>notificaciones</code> en Directus</h4><pre><code class="language-sql">-- Migración: 020_create_notificaciones.sql
CREATE TABLE notificaciones (
id INT AUTO_INCREMENT PRIMARY KEY,
user_id CHAR(36) NOT NULL,
tipo ENUM('pago_vencido','nueva_venta','pago_recibido','sistema') NOT NULL,
titulo VARCHAR(255) NOT NULL,
mensaje TEXT,
leida BOOLEAN DEFAULT FALSE,
url_accion VARCHAR(500),
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
INDEX idx_user_leida (user_id, leida)
);
</code></pre><h4>G.2 — Componente <code>NotificationsInbox</code></h4><p><strong>Archivo nuevo:</strong> <code>frontend/components/layout/NotificationsInbox.tsx</code></p><pre><code class="language-tsx">// Campana en Navbar con badge de no leídas
// Dropdown con lista de notificaciones
// Marcar como leída al hacer click
// Marcar todas como leídas
// Link a la acción relevante (venta, pago, cliente)
</code></pre><h4>G.3 — Hook <code>useNotifications</code></h4><p><strong>Archivo nuevo:</strong> <code>frontend/hooks/useNotifications.ts</code></p><pre><code class="language-typescript">// Polling cada 60s para nuevas notificaciones
// O WebSocket subscription a colección 'notificaciones'
// Estado: unreadCount, notifications[], markAsRead(), markAllAsRead()
</code></pre><h4>G.4 — Triggers automáticos de notificaciones</h4><p>En <code>extensions/directus-extension-hook-crm-logic/</code>:</p><ul> <li>Pago vencido → notificación al vendedor asignado</li> <li>Nueva venta creada → notificación al admin</li> <li>Pago recibido → notificación al cliente (portal)</li> </ul><p><strong>Definition of Done (G):</strong></p><ul> <li><input disabled="" type="checkbox"> Tabla <code>notificaciones</code> migrada y registrada en Directus</li> <li><input disabled="" type="checkbox"> Inbox en Navbar con badge de no leídas</li> <li><input disabled="" type="checkbox"> Notificaciones en tiempo real vía WebSocket</li> <li><input disabled="" type="checkbox"> Triggers automáticos para eventos clave</li> <li><input disabled="" type="checkbox"> Portal de clientes recibe notificaciones de pagos</li> </ul><hr><h3>📊 FASE H: Homogeneizar Consumo de KPIs (BFF Unificado)</h3><p><strong>Objetivo:</strong> Resolver la inconsistencia donde <code>Executive View</code> llama directamente a Directus (<code>/crm-analytics/kpis</code>) mientras el resto usa la capa BFF (<code>/api/dashboard/kpis</code>).</p><h4>H.1 — Unificar en capa BFF</h4><p>Actualizar <code>app/dashboard/page.tsx</code> para usar <code>fetchKPIs()</code> de <code>lib/dashboard-api.ts</code> en lugar de <code>directusClient.get('/crm-analytics/kpis')</code> directamente.</p><h4>H.2 — Conectar "Comisiones pendientes" en Executive View</h4><pre><code class="language-tsx">// En app/dashboard/page.tsx:
// Actualmente: "No disponible"
// Después: kpis.comisiones_pendientes formateado con formatCurrencyMXN()
</code></pre><h4>H.3 — Completar gráfico "Ventas por Zona"</h4><p>En <code>app/dashboard/ventas/page.tsx</code>, el componente "Gráfico de Ventas por Zona" está como placeholder. Implementar:</p><ul> <li>Query a Directus agrupando ventas por <code>lote_id.zona</code></li> <li>Gráfico de barras horizontales con <code>recharts</code></li> </ul><h4>H.4 — Añadir endpoint <code>/api/dashboard/ventas-por-zona</code></h4><p><strong>Archivo nuevo:</strong> <code>frontend/app/api/dashboard/ventas-por-zona/route.ts</code></p><pre><code class="language-typescript">// Query: SELECT lotes.zona, COUNT(\*) as total, SUM(ventas.monto_total) as monto
// FROM ventas JOIN lotes ON ventas.lote_id = lotes.id
// GROUP BY lotes.zona
</code></pre><p><strong>Definition of Done (H):</strong></p><ul> <li><input disabled="" type="checkbox"> Executive View usa BFF (<code>fetchKPIs</code>) como todos los demás dashboards</li> <li><input disabled="" type="checkbox"> "Comisiones pendientes" muestra dato real</li> <li><input disabled="" type="checkbox"> Gráfico "Ventas por Zona" implementado</li> <li><input disabled="" type="checkbox"> Endpoint <code>/api/dashboard/ventas-por-zona</code> funcional</li> </ul><hr><h3>⚙️ FASE I: Configuración Real del Sistema</h3><p><strong>Objetivo:</strong> La página <code>/dashboard/configuracion</code> es actualmente un placeholder estático.</p><h4>I.1 — Perfil de Usuario</h4><ul> <li>Editar nombre, email, avatar (upload a Directus)</li> <li>Cambiar contraseña (llamada a <code>/users/me</code> de Directus)</li> </ul><h4>I.2 — Configuración del Negocio</h4><ul> <li>Nombre del fraccionamiento, logo, dirección</li> <li>Tasas de interés por defecto para nuevas ventas</li> <li>Porcentaje de comisión por defecto para vendedores</li> <li>Configuración de Stripe (modo test/producción)</li> </ul><h4>I.3 — Gestión de Usuarios y Roles</h4><ul> <li>Crear/editar/desactivar usuarios (Admin only)</li> <li>Asignar roles (Administrador/Vendedor/Cliente)</li> <li>Vincular usuario Directus con registro de cliente/vendedor</li> </ul><p><strong>Definition of Done (I):</strong></p><ul> <li><input disabled="" type="checkbox"> Perfil de usuario editable con avatar</li> <li><input disabled="" type="checkbox"> Cambio de contraseña funcional</li> <li><input disabled="" type="checkbox"> Configuración del negocio persistida en Directus</li> <li><input disabled="" type="checkbox"> Gestión básica de usuarios (Admin only)</li> </ul><hr><h3>🧪 FASE J: Testing y Calidad</h3><p><strong>Objetivo:</strong> Ampliar la cobertura de tests existentes (Playwright e2e + Vitest unit).</p><h4>J.1 — Tests E2E críticos (Playwright)</h4><p>Archivos existentes en <code>frontend/tests/e2e/</code>:</p><ul> <li><code>wizard.spec.ts</code> — Completar con pasos 5 y 6</li> <li><code>mapa.spec.ts</code> — Agregar tests de selección y filtros</li> <li><code>dashboard.spec.ts</code> — Agregar tests de KPIs y gráficos</li> <li><strong>Nuevo:</strong> <code>customer360.spec.ts</code> — Tests de vista de cliente</li> <li><strong>Nuevo:</strong> <code>command-palette.spec.ts</code> — Tests de Ctrl+K</li> </ul><h4>J.2 — Tests unitarios (Vitest)</h4><ul> <li><code>lib/utils.test.ts</code> — <code>formatCurrencyMXN</code>, <code>formatNumberCompact</code>, <code>formatPercent</code></li> <li><code>lib/dashboard-api.test.ts</code> — Mocks de endpoints, manejo de 403</li> <li><code>components/wizard/WizardVenta.test.tsx</code> — Autosave, navegación entre pasos</li> <li><code>hooks/useDirectusRealtime.test.ts</code> — Conexión, reconexión, mensajes</li> </ul><h4>J.3 — Accessibility Tests</h4><p>Ampliar <code>tests/e2e/accessibility.spec.ts</code>:</p><ul> <li>Contraste de colores con nueva paleta Quintas</li> <li>Navegación por teclado en Wizard y Command Palette</li> <li>ARIA labels en Mapa SVG (lotes como elementos interactivos)</li> </ul><p><strong>Definition of Done (J):</strong></p><ul> <li><input disabled="" type="checkbox"> Cobertura E2E &gt; 80% de flujos críticos</li> <li><input disabled="" type="checkbox"> Tests unitarios para utils y hooks</li> <li><input disabled="" type="checkbox"> 0 violaciones WCAG AA en páginas principales</li> <li><input disabled="" type="checkbox"> CI/CD pasa todos los tests antes de merge</li> </ul><hr><h2>📅 CRONOGRAMA SUGERIDO (8 Semanas)</h2><pre><code>Semana 1 │ FASE A (Design Tokens) + FASE H (BFF unificado)
Semana 2 │ FASE B (Wizard 6 pasos) — Steps 5 y 6
Semana 3 │ FASE C (Customer 360) — Ribbon + KPIs + Timeline
Semana 4 │ FASE D (Command Palette) + FASE E (Mobile Sidebar)
Semana 5 │ FASE F (WebSocket Tiempo Real) — Hook + Dashboard + Mapa
Semana 6 │ FASE G (Notificaciones Inbox) + FASE I (Configuración)
Semana 7 │ FASE H completar (Ventas por Zona) + Pulido visual
Semana 8 │ FASE J (Testing) + Documentación + Preparación producción
</code></pre><hr><h2>🔧 DEUDA TÉCNICA IDENTIFICADA</h2><h3>Alta Prioridad</h3><table class="e-rte-table"> <thead> <tr> <th>Item</th> <th>Archivo</th> <th>Descripción</th> </tr> </thead> <tbody><tr> <td><code>ignoreBuildErrors: true</code></td> <td><code>next.config.mjs</code></td> <td>TypeScript errors ignorados en build. Debe resolverse antes de producción</td> </tr> <tr> <td><code>any</code> types</td> <td><code>dashboard/comisiones/page.tsx</code>, <code>dashboard/pagos/page.tsx</code></td> <td>Usar tipos de <code>types/dashboard.ts</code></td> </tr> <tr> <td>Filtro de pagos por venta</td> <td><code>ventas/[id]/page.tsx</code></td> <td><code>fetchPagos()</code> trae TODOS los pagos y filtra en cliente. Debe filtrarse en servidor</td> </tr> <tr> <td>Stats mock en Developer Portal</td> <td><code>developer-portal/page.tsx</code></td> <td><code>requestsCount = 1250</code> y <code>errorRate = '0.5%'</code> son valores hardcodeados</td> </tr> <tr> <td><code>getServerSession(authOptions)</code></td> <td><code>oauth/consent/page.tsx</code></td> <td>Usar <code>auth()</code> de NextAuth v5 en lugar de la API v4</td> </tr> </tbody></table><h3>Media Prioridad</h3><table class="e-rte-table"> <thead> <tr> <th>Item</th> <th>Archivo</th> <th>Descripción</th> </tr> </thead> <tbody><tr> <td>Fuentes tipográficas</td> <td><code>app/layout.tsx</code></td> <td>No se cargan las fuentes serif (branding) + sans (UI) del Design System</td> </tr> <tr> <td><code>proj4</code> en devDependencies</td> <td><code>package.json</code></td> <td>Está en <code>dependencies</code> pero solo se usa para conversión UTM en <code>directus-api.ts</code></td> </tr> <tr> <td>Wizard state en localStorage</td> <td><code>WizardVenta.tsx</code></td> <td>Datos sensibles (cliente, términos) en localStorage sin cifrado</td> </tr> <tr> <td><code>redirect</code> en Home</td> <td><code>app/page.tsx</code></td> <td>Redirige siempre a <code>/portal/auth/login</code>. Debería redirigir según rol</td> </tr> </tbody></table><hr><h2>🏗️ ARQUITECTURA DE PRÓXIMOS COMPONENTES</h2><pre><code>frontend/
├── app/
│ ├── dashboard/
│ │ ├── page.tsx ← Actualizar: usar fetchKPIs() BFF
│ │ └── ventas/page.tsx ← Completar: gráfico Ventas por Zona
│ └── developer-portal/
│ └── tokens/page.tsx ← NUEVO: Token Playground
├── components/
│ ├── clientes/ ← NUEVO directorio
│ │ ├── ClienteRibbon.tsx
│ │ ├── ClienteKPIs.tsx
│ │ ├── ClienteTimeline.tsx
│ │ └── ClienteAcciones.tsx
│ ├── layout/
│ │ ├── CommandPalette.tsx ← NUEVO
│ │ ├── MobileSidebarDrawer.tsx ← NUEVO
│ │ ├── NotificationsInbox.tsx ← NUEVO
│ │ └── RealtimeIndicator.tsx ← NUEVO
│ ├── portal/
│ │ └── BottomNav.tsx ← NUEVO
│ └── wizard/
│ ├── Step5Documentos.tsx ← NUEVO
│ └── Step6Confirmacion.tsx ← NUEVO
├── hooks/
│ ├── useCommandPalette.ts ← NUEVO
│ ├── useDirectusRealtime.ts ← NUEVO
│ └── useNotifications.ts ← NUEVO
├── lib/
│ └── tokens.ts ← NUEVO: Design tokens como constantes TS
└── public/
└── tokens.json ← NUEVO: Design tokens para herramientas externas
</code></pre><hr><h2>🎯 MÉTRICAS DE ÉXITO</h2><table class="e-rte-table"> <thead> <tr> <th>Métrica</th> <th>Actual</th> <th>Objetivo</th> </tr> </thead> <tbody><tr> <td>Consistencia visual (paleta Quintas)</td> <td>~30%</td> <td>100%</td> </tr> <tr> <td>Pasos del Wizard</td> <td>4/6</td> <td>6/6</td> </tr> <tr> <td>Latencia de actualización de datos</td> <td>30s (polling)</td> <td>&lt; 1s (WebSocket)</td> </tr> <tr> <td>Cobertura de tests E2E</td> <td>~40%</td> <td>&gt; 80%</td> </tr> <tr> <td>Errores TypeScript en build</td> <td>Ignorados</td> <td>0</td> </tr> <tr> <td>Accesibilidad WCAG AA</td> <td>No verificado</td> <td>100% páginas principales</td> </tr> <tr> <td>Mobile UX (sidebar/nav)</td> <td>Sin soporte</td> <td>Completo</td> </tr> </tbody></table><hr><h2>📋 CHECKLIST DE INICIO INMEDIATO</h2><p>Para comenzar la próxima sesión de desarrollo, ejecutar en orden:</p><pre><code class="language-bash"># 1. Verificar estado del entorno
docker-compose up -d &amp;&amp; docker-compose ps

# 2. Verificar que el frontend compila

cd frontend &amp;&amp; npm run build 2&gt;&amp;1 | grep -E "error|warning" | head -20

# 3. Verificar tokens TypeScript pendientes

cd frontend &amp;&amp; npx tsc --noEmit 2&gt;&amp;1 | head -30

# 4. Iniciar desarrollo

cd frontend &amp;&amp; npm run dev
</code></pre><p><strong>Primera tarea recomendada:</strong> Comenzar con <strong>FASE A</strong> (Design Tokens) ya que es la base visual de todo lo demás y tiene el mayor impacto visual inmediato con el menor riesgo de romper funcionalidad existente.</p><hr><p><em>Documento generado el: 2025 | Repositorio: nhadadn/quintas-crm | Rama: main</em></p>

# Documentación de Componentes Frontend ERP

Este documento detalla los componentes desarrollados para el Frontend del ERP Inmobiliario Quintas de Otinapa.

## 1. Mapa SVG Interactivo

Ubicación: `frontend/components/mapa-svg`

### MapaSVGInteractivo

Componente principal que gestiona el estado del mapa, la carga de datos y la renderización de subcomponentes.

**Props:**

- `svgViewBox`: string (opcional, default "0 0 1000 1000")
- `onLoteSeleccionado`: (lote) => void
- `modoSeleccion`: boolean
- `panelFooter`: ReactNode

**Uso:**

```tsx
import { MapaSVGInteractivo } from '@/components/mapa-svg/MapaSVGInteractivo';

export default function Page() {
  return <MapaSVGInteractivo />;
}
```

### SVGLoteLayer

Renderiza los paths SVG de los lotes y maneja la coloración e interacción.

**Props:**

- `lotes`: LoteFeature[] (Lotes filtrados)
- `svgConfig`: FrontendConfig (Configuración de paths)
- `onSelectLote`: (lote) => void

**Características:**

- Colorea según estatus (Disponible: Verde, Apartado: Amarillo, Vendido: Rojo).
- Maneja opacidad en hover.
- Renderiza lotes no coincidentes con filtros en color tenue.

### PanelLote

Muestra la información detallada del lote seleccionado.

**Props:**

- `selectedLote`: LoteProperties | null
- `onClose`: () => void
- `footer`: ReactNode (Botones de acción)

### FiltrosMapa

Panel de filtros para el mapa.

**Filtros disponibles:**

- Estatus (Disponible, Apartado, Vendido)
- Número de lote (Búsqueda parcial)

## 2. Dashboard

Ubicación: `frontend/components/dashboard`

### StatsCard

Tarjeta para mostrar KPIs.

**Props:**

- `title`: string
- `value`: string | number
- `change`: string (opcional)
- `changeType`: 'positive' | 'negative' | 'neutral'
- `icon`: ReactNode (opcional)

### SalesChart

Gráfica de barras simple basada en CSS/Flexbox (sin dependencias externas).

**Props:**

- `title`: string
- `data`: { label: string, value: number }[]

### RecentSalesTable

Tabla simplificada para mostrar las últimas ventas en el dashboard.

**Props:**

- `ventas`: Array de objetos de venta

## 3. Páginas Principales

- `/`: Dashboard principal con KPIs, gráficas y accesos directos.
- `/mapa`: Visualización a pantalla completa del Mapa SVG Interactivo.
- `/ventas`: Gestión de ventas (Tabla completa).
- `/pagos`: Gestión de pagos (Tabla completa).
- `/clientes`: Gestión de clientes (Lista, Detalles, Edición).
- `/vendedores`: Gestión de vendedores y comisiones.

## 4. Estilos

El proyecto utiliza Tailwind CSS con una paleta de colores personalizada basada en `slate` (fondo oscuro) y `emerald` (acciones principales).

**Convenciones:**

- Fondo principal: `bg-slate-950`
- Paneles/Tarjetas: `bg-slate-800 border-slate-700`
- Texto principal: `text-slate-100`
- Texto secundario: `text-slate-400`
- Botones primarios: `bg-emerald-600 hover:bg-emerald-500`

## 5. Próximos Pasos (TODO)

- Conectar Dashboard con API real (actualmente usa Mock Data).
- Implementar "Mis Ventas" para vista de Vendedor.
- Mejorar interactividad de la gráfica de ventas.

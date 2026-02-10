# 🤖 PROMPTS COMPLETOS PARA HERRAMIENTAS - REFACTORIZACIÓN SVG

**Proyecto:** Quintas de Otinapa  
**Objetivo:** Migración de Mapbox a SVG  
**Fecha:** 16 de Enero, 2026

---

## 📋 ÍNDICE DE PROMPTS

1. [Prompts para TRAE.IA](#prompts-para-traeia)
2. [Prompts para Figma](#prompts-para-figma)
3. [Prompts para KOMBAI](#prompts-para-kombai)
4. [Prompts para Cursor/IDE](#prompts-para-cursoride)

---

## 🔧 PROMPTS PARA TRAE.IA

### PROMPT 1: Análisis y Preparación del Proyecto

```
CONTEXTO:
Soy desarrollador trabajando en "Quintas de Otinapa", un proyecto de gestión inmobiliaria con mapa interactivo. Actualmente usa Mapbox GL JS pero necesito migrar a SVG nativo para eliminar dependencias externas y usar el plano real del proyecto.

ESTADO ACTUAL:
- Frontend: Next.js 14 + TypeScript + Tailwind CSS
- Backend: Directus CRM (puerto 8055)
- Base de Datos: MySQL 8.0
- Mapa: Mapbox GL JS (a eliminar)
- 50 lotes georeferenciados con coordenadas UTM

OBJETIVO:
Analizar el proyecto actual y preparar la estructura para migración a SVG.

TAREAS:

1. ANÁLISIS DE DEPENDENCIAS:
   - Listar todas las dependencias relacionadas con Mapbox
   - Identificar código que usa Mapbox
   - Determinar qué se puede reutilizar

2. ESTRUCTURA DE CARPETAS:
   Crear la siguiente estructura en frontend/:
```

frontend/
├── components/
│ └── mapa-svg/
│ ├── MapaSVGInteractivo.tsx
│ ├── SVGLoteLayer.tsx
│ ├── PanelLote.tsx
│ ├── Leyenda.tsx
│ ├── ControlesMapa.tsx
│ └── FiltrosMapa.tsx
├── lib/
│ ├── directus-api.ts (actualizar)
│ └── svg/
│ ├── svg-utils.ts
│ └── svg-mapper.ts
├── types/
│ ├── lote.ts (actualizar)
│ └── svg.ts (nuevo)
└── public/
└── mapas/
└── mapa-quintas.svg

```

3. ACTUALIZAR PACKAGE.JSON:
- Remover: mapbox-gl, @types/mapbox-gl, proj4
- Agregar: react-svg, xml2js, @types/xml2js

4. CREAR SCRIPTS DE UTILIDAD:
- Script para analizar SVG
- Script para mapear lotes a paths SVG
- Script para actualizar base de datos

5. GENERAR DOCUMENTACIÓN:
- README con nuevas instrucciones
- Guía de migración
- Changelog

ENTREGABLES:
1. Estructura de carpetas creada
2. package.json actualizado
3. Scripts de utilidad en /scripts
4. Documentación básica

FORMATO DE SALIDA:
- Comandos ejecutables en PowerShell
- Archivos TypeScript con tipos completos
- Comentarios explicativos en código
- Logs de progreso en consola

RESTRICCIONES:
- No modificar base de datos aún
- No tocar Directus
- Mantener compatibilidad con código existente
- Usar TypeScript strict mode
```

---

### PROMPT 2: Refactorización de Estructura Backend

````
CONTEXTO:
Continuando con la migración de Mapbox a SVG en "Quintas de Otinapa". La estructura frontend está lista, ahora necesito preparar el backend.

ESTADO ACTUAL:
- Directus CRM funcionando en puerto 8055
- Endpoint nativo: /items/lotes (devuelve lotes con geometría UTM)
- Base de datos MySQL con 50 lotes
- Campos actuales: id, numero_lote, zona, manzana, geometria, latitud, longitud, etc.

OBJETIVO:
Preparar backend para servir datos SVG sin romper funcionalidad existente.

TAREAS:

1. ACTUALIZAR BASE DE DATOS:
   Crear script SQL: database/02_agregar_campos_svg.sql
   ```sql
   ALTER TABLE lotes
   ADD COLUMN svg_path_id VARCHAR(50) NULL,
   ADD COLUMN svg_coordinates TEXT NULL,
   ADD COLUMN svg_transform VARCHAR(255) NULL,
   ADD COLUMN svg_centroid_x DECIMAL(10,2) NULL,
   ADD COLUMN svg_centroid_y DECIMAL(10,2) NULL;

   CREATE INDEX idx_svg_path_id ON lotes(svg_path_id);
````

2. CREAR ENDPOINT DIRECTUS:
   Archivo: extensions/endpoints/svg-map/index.js
   - GET /svg-map → Devuelve lotes con datos SVG
   - GET /svg-map/:id → Devuelve lote específico
   - Filtrar solo lotes con svg_path_id no nulo
   - Incluir todos los campos necesarios

3. SCRIPT DE MAPEO:
   Archivo: scripts/mapear_lotes_svg.js
   - Leer archivo SVG
   - Extraer paths con IDs
   - Crear mapeo: numero_lote → svg_path_id
   - Guardar en JSON

4. SCRIPT DE ACTUALIZACIÓN:
   Archivo: scripts/actualizar_lotes_con_svg.js
   - Leer mapeo JSON
   - Conectar a MySQL
   - Actualizar cada lote con datos SVG
   - Reportar progreso

5. ACTUALIZAR API CLIENT:
   Archivo: frontend/lib/directus-api.ts
   - Crear función: fetchLotesConSVG()
   - Remover conversión UTM (ya no necesaria)
   - Mantener funciones existentes para compatibilidad

ENTREGABLES:

1. Script SQL ejecutable
2. Endpoint Directus funcionando
3. Scripts Node.js documentados
4. API client actualizado
5. Tests de integración

FORMATO DE SALIDA:

- SQL con comentarios
- JavaScript con JSDoc
- TypeScript con tipos completos
- Logs detallados de ejecución

VALIDACIÓN:

- Probar endpoint: curl http://localhost:8055/svg-map
- Verificar datos en MySQL
- Confirmar que API client funciona

```

---

### PROMPT 3: Implementación de Componentes Frontend

```

CONTEXTO:
Backend listo para SVG. Ahora necesito implementar los componentes frontend que reemplazan Mapbox.

ESTADO ACTUAL:

- Estructura de carpetas creada
- API client actualizado
- Endpoint /svg-map funcionando
- Archivo SVG disponible en public/mapas/mapa-quintas.svg

OBJETIVO:
Implementar componentes React para visualización SVG interactiva.

TAREAS:

1. COMPONENTE PRINCIPAL: MapaSVGInteractivo.tsx
   Ubicación: frontend/components/mapa-svg/MapaSVGInteractivo.tsx

   Requisitos:
   - Cargar SVG desde /public/mapas/mapa-quintas.svg
   - Obtener lotes desde API (fetchLotesConSVG)
   - Aplicar colores a paths según estatus
   - Manejar estado: zoom, pan, selectedLote
   - Implementar event listeners: click, hover
   - Renderizar componentes hijos: Panel, Leyenda, Controles

   Estado:

   ```typescript
   interface MapState {
     zoom: number; // 0.5 - 3.0
     pan: { x: number; y: number };
     selectedLote: Lote | null;
     loading: boolean;
     error: string | null;
   }
   ```

   Funciones:
   - handleLoteClick(lote: Lote)
   - handleZoomIn()
   - handleZoomOut()
   - handleReset()
   - applyColors()

2. COMPONENTE: SVGLoteLayer.tsx
   Ubicación: frontend/components/mapa-svg/SVGLoteLayer.tsx

   Requisitos:
   - Recibir lotes como props
   - Renderizar paths SVG con colores
   - Aplicar transformaciones (zoom, pan)
   - Event handlers para interactividad
   - Etiquetas de número de lote (opcional)

3. COMPONENTE: PanelLote.tsx
   Ubicación: frontend/components/mapa-svg/PanelLote.tsx

   Requisitos:
   - Mostrar información del lote seleccionado
   - Animación slide-in desde derecha
   - Botón cerrar
   - Responsive: bottom sheet en mobile
   - Estilos Tailwind

4. COMPONENTE: Leyenda.tsx
   Ubicación: frontend/components/mapa-svg/Leyenda.tsx

   Requisitos:
   - Mostrar estatus con colores
   - Posición fixed bottom-left
   - Fondo blanco con sombra
   - Responsive

5. COMPONENTE: ControlesMapa.tsx
   Ubicación: frontend/components/mapa-svg/ControlesMapa.tsx

   Requisitos:
   - Botones: Zoom In, Zoom Out, Reset
   - Indicador de nivel de zoom
   - Posición fixed top-right
   - Iconos claros

6. UTILIDADES SVG:
   Archivo: frontend/lib/svg/svg-utils.ts

   Funciones:
   - parsePathCoordinates(pathData: string): [number, number][]
   - calculateCentroid(coords: [number, number][]): [number, number]
   - calculateBounds(coords: [number, number][]): SVGBounds
   - getColorByEstatus(estatus: string): string
   - applyTransform(x, y, zoom, panX, panY): [number, number]

7. TIPOS TYPESCRIPT:
   Archivo: frontend/types/svg.ts

   Interfaces:
   - SVGBounds
   - SVGTransform
   - SVGMapState

ENTREGABLES:

1. 6 componentes React funcionales
2. Utilidades SVG completas
3. Tipos TypeScript
4. Estilos Tailwind integrados
5. Documentación JSDoc

FORMATO DE SALIDA:

- TypeScript con tipos estrictos
- Componentes funcionales con hooks
- Tailwind CSS para estilos
- Comentarios explicativos
- Logs de debugging

VALIDACIÓN:

- npm run lint sin errores
- npm run build exitoso
- Mapa se visualiza correctamente
- Interacciones funcionan

```

---

## 🎨 PROMPTS PARA FIGMA

### PROMPT 1: Diseño de Interfaz Principal

```

BRIEF DE DISEÑO - MAPA SVG INTERACTIVO QUINTAS DE OTINAPA

CONTEXTO DEL PROYECTO:
"Quintas de Otinapa" es un desarrollo inmobiliario en Durango, México, con 1,500+ lotes residenciales. Necesitamos una interfaz web moderna para visualizar y gestionar estos lotes usando un mapa SVG interactivo.

USUARIOS OBJETIVO:

1. Compradores potenciales (buscan lotes disponibles)
2. Vendedores (65 personas, gestionan ventas)
3. Administrador (owner, supervisa todo)

OBJETIVO DEL DISEÑO:
Crear una Single Page Application (SPA) centrada en el mapa SVG como elemento principal, con información detallada de lotes y controles intuitivos.

---

ESPECIFICACIONES TÉCNICAS:

1. RESOLUCIONES:
   - Desktop: 1920x1080 (principal)
   - Tablet: 1024x768
   - Mobile: 375x667

2. PALETA DE COLORES:
   Basada en la identidad de Quintas de Otinapa:

   Colores Primarios:
   - Verde Quintas: #3D6B1F (principal)
   - Verde Oscuro: #2D5016 (hover, énfasis)
   - Amarillo Ciervo: #F4C430 (acentos, CTA)

   Colores de Estatus:
   - Disponible: #10B981 (verde brillante)
   - Apartado: #F59E0B (amarillo/naranja)
   - Vendido: #EF4444 (rojo)
   - Liquidado: #6366F1 (azul/índigo)
   - Bloqueado: #6B7280 (gris)

   Colores de UI:
   - Background: #F9FAFB (gris muy claro)
   - Surface: #FFFFFF (blanco)
   - Text Primary: #1F2937 (gris oscuro)
   - Text Secondary: #6B7280 (gris medio)
   - Border: #E5E7EB (gris claro)

3. TIPOGRAFÍA:
   - Headings: Georgia (serif, elegante, del logo)
   - Body: Inter (sans-serif, legible)
   - Números: Roboto Mono (monospace, para precios)

   Tamaños:
   - H1: 48px / Bold
   - H2: 32px / Bold
   - H3: 24px / Semibold
   - Body: 16px / Regular
   - Small: 14px / Regular
   - Caption: 12px / Regular

---

COMPONENTES A DISEÑAR:

1. HEADER (Altura: 80px, Fixed)
   Contenido:
   - Logo "Quintas de Otinapa" (izquierda, 180px ancho)
   - Navegación horizontal (centro):
     - Inicio
     - Lotes Disponibles
     - Nosotros
     - Contacto
   - Botón CTA "Agendar Visita" (derecha, verde #3D6B1F)
   - Icono usuario (derecha, para login)

   Estados:
   - Normal
   - Hover en links
   - Active en página actual
   - Scroll (con sombra)

2. ÁREA DEL MAPA SVG (70% del viewport)
   Contenido:
   - Mapa SVG centrado
   - Fondo: Textura sutil de terreno o imagen satelital con overlay
   - Lotes como polígonos con colores según estatus
   - Etiquetas de número de lote (visibles en zoom > 50%)

   Interacciones:
   - Hover: Aumentar opacidad + borde blanco 3px
   - Click: Seleccionar + borde amarillo 4px + sombra
   - Cursor: pointer en hover

3. PANEL LATERAL DERECHO (30% viewport, 400px ancho)

   Estado: Sin Selección
   - Título: "Selecciona un lote"
   - Ilustración: Icono de mapa con cursor
   - Texto: "Haz click en cualquier lote del mapa para ver su información"
   - Botón: "Ver Todos los Lotes" (outline)

   Estado: Lote Seleccionado
   - Header:
     - Número de lote (H2, 32px, Bold)
     - Badge de estatus (pill, color dinámico)
     - Botón cerrar (X, top-right)
   - Información (Grid 2 columnas):
     - Zona: [A/B/C]
     - Manzana: [01-99]
     - Área: [1000] m²
     - Dimensiones: [25 × 40] m
     - Topografía: [Plano/Pendiente]
     - Vista: [Sin vista/Parcial/Panorámica/Premium]
   - Precio (Destacado):
     - Precio lista: $350,000 (36px, Bold, Verde)
     - Precio por m²: $350 / m² (16px, Gris)
     - Descuento: -10% (si aplica, rojo)
   - Características:
     - Servicios disponibles: [Luz, Agua, Drenaje]
     - Acceso directo: [Sí/No]
   - Notas:
     - Texto descriptivo del lote
     - Máximo 3 líneas, expandible
   - Acciones:
     - Botón "Apartar Lote" (Full width, Verde, Bold)
       - Solo visible si estatus = disponible
     - Botón "Más Información" (Full width, Outline)
     - Botón "Compartir" (Icono)

4. LEYENDA (Bottom-Left, Floating)
   Contenido:
   - Fondo: Blanco con sombra suave
   - Padding: 16px
   - Border-radius: 12px
   - Título: "Leyenda" (Bold, 14px)
   - Items (vertical):
     - ● Verde - Disponible (12 lotes)
     - ● Amarillo - Apartado (5 lotes)
     - ● Rojo - Vendido (28 lotes)
     - ● Azul - Liquidado (5 lotes)
   - Contador dinámico por estatus

5. CONTROLES DE MAPA (Top-Right, Floating)
   Contenido:
   - Fondo: Blanco con sombra
   - Border-radius: 8px
   - Botones verticales:
     - Zoom In (+) - 40x40px
     - Zoom Out (-) - 40x40px
     - Separador (línea)
     - Reset View (⟲) - 40x40px
   - Indicador de zoom: "150%" (pequeño, abajo)

   Estados:
   - Normal
   - Hover (fondo gris claro)
   - Active (fondo gris)
   - Disabled (gris, opacidad 50%)

6. FILTROS (Top-Left, Floating)
   Contenido:
   - Fondo: Blanco con sombra
   - Padding: 20px
   - Border-radius: 12px
   - Título: "Filtrar Lotes" (Bold, 16px)

   Controles:
   - Dropdown: Estatus
     - Opciones: Todos, Disponible, Apartado, Vendido, Liquidado
   - Dropdown: Zona
     - Opciones: Todas, A, B, C
   - Dropdown: Manzana
     - Opciones: Todas, 01-99
   - Range Slider: Precio
     - Min: $0
     - Max: $1,000,000
     - Valores actuales visibles
   - Range Slider: Área
     - Min: 500 m²
     - Max: 2000 m²
   - Botón "Aplicar Filtros" (Verde, full width)
   - Link "Limpiar filtros" (pequeño, gris)

   Estado Colapsado (Mobile):
   - Solo icono de filtro
   - Expandible con click

7. CONTADOR DE RESULTADOS (Top-Center)
   Contenido:
   - Fondo: Blanco con sombra
   - Padding: 12px 20px
   - Border-radius: 20px (pill)
   - Texto: "Mostrando 12 de 50 lotes"
   - Icono: 🏠

---

ESTADOS Y VARIANTES:

1. LOADING:
   - Skeleton del mapa (gris animado)
   - Spinner centrado
   - Texto: "Cargando mapa..."

2. ERROR:
   - Mensaje centrado
   - Icono de error
   - Texto: "Error al cargar el mapa"
   - Botón "Reintentar"

3. EMPTY:
   - Ilustración: Mapa vacío
   - Texto: "No hay lotes disponibles con estos filtros"
   - Botón "Limpiar filtros"

4. RESPONSIVE MOBILE:
   - Header: 60px altura, hamburger menu
   - Mapa: Full width, 60% altura
   - Panel: Bottom sheet (40% altura)
     - Deslizable hacia arriba
     - Handle visible (línea gris)
   - Leyenda: Minimizada, expandible con tap
   - Controles: Más pequeños, bottom-right
   - Filtros: Modal full screen

---

INTERACCIONES Y ANIMACIONES:

1. Transiciones:
   - Hover: 200ms ease-in-out
   - Panel lateral: 300ms slide-in
   - Zoom: 300ms ease-in-out
   - Filtros: 200ms fade-in

2. Microinteracciones:
   - Botones: Scale 0.95 en click
   - Lotes: Pulse en hover
   - Badges: Subtle bounce en aparición

3. Feedback:
   - Loading: Spinner + skeleton
   - Success: Checkmark verde + mensaje
   - Error: Shake + mensaje rojo

---

ACCESIBILIDAD:

1. Contraste:
   - Mínimo WCAG AA (4.5:1 para texto)
   - Texto sobre fondos de color: verificar contraste

2. Focus:
   - Visible en todos los controles
   - Ring azul 2px

3. Tamaños:
   - Botones mínimo 44x44px (touch target)
   - Texto mínimo 14px

---

ENTREGABLES ESPERADOS:

1. Pantallas Principales:
   - Desktop: Vista completa (1920x1080)
   - Tablet: Vista adaptada (1024x768)
   - Mobile: Vista móvil (375x667)

2. Estados:
   - Panel sin selección
   - Panel con lote seleccionado
   - Loading
   - Error
   - Empty state

3. Componentes Individuales:
   - Header (con variantes)
   - Panel lateral (con variantes)
   - Leyenda
   - Controles de mapa
   - Filtros (expandido y colapsado)
   - Botones (todos los estados)

4. Guía de Estilos:
   - Paleta de colores completa
   - Tipografía con tamaños
   - Espaciados y márgenes
   - Sombras y elevaciones
   - Iconografía

5. Prototipo Interactivo:
   - Navegación entre pantallas
   - Interacciones principales
   - Transiciones

---

FORMATO DE ENTREGA:

1. Archivo Figma:
   - Páginas separadas por pantalla
   - Frames nombrados claramente
   - Auto-layout en todos los componentes
   - Componentes reutilizables
   - Variantes para estados
   - Design tokens (colores, tipografía)

2. Organización:
   - Página 1: Cover + Índice
   - Página 2: Guía de estilos
   - Página 3: Componentes
   - Página 4: Pantallas Desktop
   - Página 5: Pantallas Tablet
   - Página 6: Pantallas Mobile
   - Página 7: Estados especiales
   - Página 8: Prototipo

3. Nomenclatura:
   - Frames: "Desktop - Mapa Principal"
   - Componentes: "Button/Primary/Default"
   - Colores: "Primary/Green-600"
   - Tipografía: "Heading/H2/Bold"

---

REFERENCIAS VISUALES:

Estilo deseado:

- Moderno pero elegante
- Profesional pero accesible
- Limpio y espacioso
- Enfoque en el mapa como hero

Inspiración:

- Zillow (navegación de propiedades)
- Airbnb (mapa interactivo)
- Google Maps (controles de mapa)
- Notion (panel lateral)

---

NOTAS ADICIONALES:

1. El mapa SVG es el elemento principal - debe destacar
2. Los colores de estatus deben ser claramente diferenciables
3. La información del lote debe ser fácil de escanear
4. Los controles deben ser intuitivos sin instrucciones
5. El diseño debe funcionar bien en pantallas táctiles
6. Considerar modo oscuro (opcional, fase 2)

---

PREGUNTAS PARA EL DISEÑADOR:

1. ¿Prefieres un estilo más minimalista o con más detalles visuales?
2. ¿El logo de Quintas de Otinapa tiene variantes (horizontal, vertical)?
3. ¿Hay fotografías reales del desarrollo para usar como fondo?
4. ¿Necesitas iconografía personalizada o usamos una librería (Heroicons, Feather)?
5. ¿El proyecto tiene un manual de marca existente?

---

TIMELINE SUGERIDO:

- Día 1: Wireframes y estructura
- Día 2: Diseño visual (desktop)
- Día 3: Responsive (tablet, mobile)
- Día 4: Componentes y variantes
- Día 5: Prototipo y entrega

---

CONTACTO:

Para dudas o feedback:

- Email: proyecto@quintasdeotinapa.com
- Slack: #quintas-diseño

---

¡Gracias por tu trabajo en este proyecto!

```

---

## 🎨 PROMPTS PARA KOMBAI

### PROMPT 1: Conversión Figma a Código

```

BRIEF DE CONVERSIÓN - FIGMA A CÓDIGO REACT

CONTEXTO:
Tengo un diseño completo en Figma para "Quintas de Otinapa", un mapa SVG interactivo de lotes inmobiliarios. Necesito convertir este diseño a código React + TypeScript + Tailwind CSS.

ESPECIFICACIONES TÉCNICAS:

1. FRAMEWORK Y STACK:
   - Next.js 14 (App Router)
   - React 18
   - TypeScript (strict mode)
   - Tailwind CSS v3
   - No usar librerías de UI (Material-UI, Chakra, etc.)
   - SVG nativo (no Mapbox, no Leaflet)

2. ESTRUCTURA DE ARCHIVOS:
   Generar archivos separados para cada componente:

   ```
   frontend/
   ├── app/
   │   ├── layout.tsx
   │   ├── page.tsx
   │   └── globals.css
   ├── components/
   │   └── mapa-svg/
   │       ├── MapaSVGInteractivo.tsx    (principal)
   │       ├── SVGLoteLayer.tsx          (capa de lotes)
   │       ├── PanelLote.tsx             (panel lateral)
   │       ├── Leyenda.tsx               (leyenda de estatus)
   │       ├── ControlesMapa.tsx         (zoom, reset)
   │       ├── FiltrosMapa.tsx           (filtros)
   │       └── Header.tsx                (header)
   ├── lib/
   │   ├── directus-api.ts               (ya existe, no modificar)
   │   └── svg/
   │       └── svg-utils.ts              (utilidades SVG)
   └── types/
       ├── lote.ts                       (ya existe, no modificar)
       └── svg.ts                        (nuevo)
   ```

3. COMPONENTES A GENERAR:

   A. MapaSVGInteractivo.tsx
   Props: ninguna (componente raíz)
   Estado:

   ```typescript
   interface MapState {
     zoom: number; // 0.5 - 3.0
     pan: { x: number; y: number };
     selectedLote: Lote | null;
     loading: boolean;
     error: string | null;
   }
   ```

   Funciones:
   - handleLoteClick(lote: Lote): void
   - handleZoomIn(): void
   - handleZoomOut(): void
   - handleReset(): void
   - handleClosePanel(): void

   Renderiza:
   - SVG container con transform
   - SVGLoteLayer
   - PanelLote (condicional)
   - Leyenda
   - ControlesMapa
   - Loading state
   - Error state

   B. SVGLoteLayer.tsx
   Props:

   ```typescript
   interface SVGLoteLayerProps {
     lotes: Lote[];
     selectedLoteId: number | null;
     zoom: number;
     pan: { x: number; y: number };
     onLoteClick: (lote: Lote) => void;
   }
   ```

   Renderiza:
   - Paths SVG para cada lote
   - Colores según estatus
   - Event handlers (click, hover)
   - Etiquetas de número (opcional)

   C. PanelLote.tsx
   Props:

   ```typescript
   interface PanelLoteProps {
     lote: Lote | null;
     onClose: () => void;
   }
   ```

   Renderiza:
   - Slide-in animation desde derecha
   - Header con número y badge
   - Grid de información
   - Precio destacado
   - Botones de acción
   - Responsive: bottom sheet en mobile

   D. Leyenda.tsx
   Props: ninguna
   Renderiza:
   - Lista de estatus con colores
   - Contador por estatus (opcional)
   - Fixed bottom-left
   - Fondo blanco con sombra

   E. ControlesMapa.tsx
   Props:

   ```typescript
   interface ControlesMapaProps {
     zoom: number;
     onZoomIn: () => void;
     onZoomOut: () => void;
     onReset: () => void;
   }
   ```

   Renderiza:
   - Botones verticales
   - Iconos claros
   - Indicador de zoom
   - Fixed top-right

   F. FiltrosMapa.tsx
   Props:

   ```typescript
   interface FiltrosMapaProps {
     onFilterChange: (filters: Filters) => void;
   }
   ```

   Estado:

   ```typescript
   interface Filters {
     estatus?: string;
     zona?: string;
     precioMin?: number;
     precioMax?: number;
   }
   ```

   Renderiza:
   - Dropdowns
   - Range sliders
   - Botón aplicar
   - Link limpiar
   - Colapsable en mobile

4. ESTILOS TAILWIND:

   Usar clases utilitarias:
   - Layout: flex, grid, absolute, fixed
   - Spacing: p-4, m-2, gap-4
   - Colors: bg-slate-900, text-white
   - Borders: border, rounded-lg
   - Shadows: shadow-xl
   - Transitions: transition-all, duration-300
   - Responsive: sm:, md:, lg:

   Colores personalizados (ya en tailwind.config.ts):

   ```javascript
   colors: {
     'quintas-green': '#3D6B1F',
     'quintas-green-dark': '#2D5016',
     'quintas-yellow': '#F4C430',
   }
   ```

5. INTERACTIVIDAD SVG:

   Manipulación de SVG:
   - Usar useRef para acceder al SVG DOM
   - setAttribute para cambiar colores
   - addEventListener para eventos
   - transform para zoom y pan

   Ejemplo:

   ```typescript
   const svgRef = useRef<SVGSVGElement>(null);

   useEffect(() => {
     if (!svgRef.current) return;

     const path = svgRef.current.querySelector('#lote-A-01-001');
     if (path) {
       path.setAttribute('fill', '#10B981');
       path.addEventListener('click', handleClick);
     }
   }, []);
   ```

6. ANIMACIONES:

   Usar Tailwind transitions:
   - Panel: `transition-transform duration-300 ease-in-out`
   - Hover: `transition-opacity duration-200`
   - Zoom: `transition-transform duration-300`

   Animaciones personalizadas (si necesario):

   ```css
   @keyframes slideIn {
     from {
       transform: translateX(100%);
     }
     to {
       transform: translateX(0);
     }
   }
   ```

7. TIPOS TYPESCRIPT:

   Generar interfaces completas:

   ```typescript
   // types/lote.ts (ya existe, usar este)
   interface Lote {
     id: number;
     numero_lote: string;
     zona: string;
     manzana: string;
     area_m2: number;
     frente_m: number;
     fondo_m: number;
     precio_lista: number;
     estatus: 'disponible' | 'apartado' | 'vendido' | 'liquidado';
     svg_path_id: string;
     svg_coordinates: string;
     svg_centroid_x: number;
     svg_centroid_y: number;
     topografia: string;
     vista: string;
     notas: string;
   }

   // types/svg.ts (nuevo)
   interface SVGBounds {
     minX: number;
     minY: number;
     maxX: number;
     maxY: number;
     width: number;
     height: number;
   }

   interface SVGTransform {
     scale: number;
     translateX: number;
     translateY: number;
   }
   ```

8. MANEJO DE ESTADO:

   Usar React hooks:
   - useState para estado local
   - useEffect para side effects
   - useRef para referencias DOM
   - useMemo para cálculos pesados
   - useCallback para funciones

   Ejemplo:

   ```typescript
   const [lotes, setLotes] = useState<Lote[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
     async function cargarLotes() {
       const data = await fetchLotesConSVG();
       setLotes(data);
       setLoading(false);
     }
     cargarLotes();
   }, []);
   ```

9. RESPONSIVE:

   Breakpoints Tailwind:
   - sm: 640px (mobile landscape)
   - md: 768px (tablet)
   - lg: 1024px (desktop)
   - xl: 1280px (large desktop)

   Estrategia:
   - Mobile first (estilos base para mobile)
   - Agregar clases md: y lg: para pantallas grandes
   - Panel lateral → bottom sheet en mobile
   - Filtros → modal en mobile
   - Controles → más pequeños en mobile

10. ACCESIBILIDAD:

    Implementar:
    - aria-label en botones sin texto
    - role="button" en elementos clickeables
    - tabIndex para navegación con teclado
    - Focus visible: `focus:ring-2 focus:ring-blue-500`
    - Alt text en imágenes
    - Semantic HTML (header, main, aside, button)

11. PERFORMANCE:

    Optimizaciones:
    - React.memo para componentes puros
    - useMemo para cálculos pesados
    - useCallback para funciones pasadas como props
    - Lazy loading de componentes pesados
    - Debounce en filtros

    Ejemplo:

    ```typescript
    const MemoizedPanel = React.memo(PanelLote);

    const filteredLotes = useMemo(() => {
      return lotes.filter((lote) => lote.estatus === 'disponible');
    }, [lotes]);
    ```

12. INTEGRACIÓN CON API:

    Usar funciones existentes de lib/directus-api.ts:

    ```typescript
    import { fetchLotesConSVG } from '@/lib/directus-api';

    useEffect(() => {
      async function cargarLotes() {
        try {
          const lotes = await fetchLotesConSVG();
          setLotes(lotes);
        } catch (error) {
          setError('Error al cargar lotes');
        }
      }
      cargarLotes();
    }, []);
    ```

---

FORMATO DE SALIDA:

1. ARCHIVOS TYPESCRIPT:
   - Extensión: .tsx
   - Indentación: 2 espacios
   - Quotes: Single quotes
   - Semicolons: Sí
   - Arrow functions: Sí

2. ESTRUCTURA DE COMPONENTE:

   ```typescript
   'use client'; // Si usa hooks

   import { useState, useEffect } from 'react';
   import type { Lote } from '@/types/lote';

   interface ComponentProps {
     // props
   }

   export default function Component({ prop1, prop2 }: ComponentProps) {
     // Estado
     const [state, setState] = useState();

     // Effects
     useEffect(() => {
       // ...
     }, []);

     // Handlers
     const handleClick = () => {
       // ...
     };

     // Render
     return (
       <div className="...">
         {/* JSX */}
       </div>
     );
   }
   ```

3. COMENTARIOS:
   - JSDoc para funciones públicas
   - Comentarios inline para lógica compleja
   - TODO para mejoras futuras

4. LOGS:
   - console.log para debugging
   - Prefijos: 🗺️ (mapa), 📍 (lote), ✅ (éxito), ❌ (error)

---

VALIDACIÓN:

Antes de entregar, verificar:

- [ ] npm run lint sin errores
- [ ] npm run build exitoso
- [ ] Todos los componentes tienen tipos
- [ ] Responsive funciona en 3 breakpoints
- [ ] Interacciones funcionan
- [ ] No hay console.errors
- [ ] Accesibilidad básica implementada

---

ENTREGABLES:

1. Archivos .tsx para cada componente
2. Archivos de tipos (.ts)
3. Estilos Tailwind integrados
4. README con instrucciones de uso
5. Ejemplos de uso de cada componente

---

RESTRICCIONES:

- NO usar librerías de UI externas
- NO usar CSS modules o styled-components
- NO usar JavaScript vanilla (solo TypeScript)
- NO modificar archivos existentes sin permiso
- SÍ usar Tailwind para todos los estilos
- SÍ usar TypeScript strict mode
- SÍ seguir convenciones de Next.js 14

---

PREGUNTAS FRECUENTES:

Q: ¿Puedo usar librerías para el SVG?
A: No, usar SVG nativo con React refs.

Q: ¿Cómo manejo el zoom?
A: Con transform CSS: scale() y translate().

Q: ¿Dónde está el archivo SVG?
A: En public/mapas/mapa-quintas.svg

Q: ¿Cómo obtengo los lotes?
A: Con fetchLotesConSVG() de lib/directus-api.ts

Q: ¿Qué hacer si un componente es muy complejo?
A: Dividirlo en subcomponentes más pequeños.

---

CONTACTO:

Para dudas técnicas:

- Email: dev@quintasdeotinapa.com
- Documentación: /docs/README.md

---

¡Gracias por tu trabajo en este proyecto!

```

---

## 💻 PROMPTS PARA CURSOR/IDE

### PROMPT 1: Refactorización Completa

```

CONTEXTO:
Estoy migrando el proyecto "Quintas de Otinapa" de Mapbox a SVG nativo. Necesito refactorizar el código existente manteniendo la funcionalidad.

ARCHIVOS ACTUALES:

- frontend/components/MapaInteractivo.tsx (usa Mapbox)
- frontend/lib/directus-api.ts (tiene conversión UTM)
- frontend/types/lote.ts (tipos actuales)

OBJETIVO:
Refactorizar estos archivos para usar SVG en lugar de Mapbox.

TAREAS:

1. ANALIZAR CÓDIGO ACTUAL:
   - Identificar todas las referencias a Mapbox
   - Listar funciones que usan proj4
   - Encontrar componentes dependientes

2. CREAR PLAN DE REFACTORIZACIÓN:
   - Qué eliminar
   - Qué modificar
   - Qué agregar

3. IMPLEMENTAR CAMBIOS:
   - Actualizar imports
   - Reemplazar lógica de Mapbox con SVG
   - Actualizar tipos
   - Mantener funcionalidad existente

4. TESTING:
   - Verificar que compila
   - Probar funcionalidad básica
   - Verificar tipos

RESTRICCIONES:

- Mantener compatibilidad con API existente
- No romper otros componentes
- Usar TypeScript strict
- Seguir convenciones del proyecto

FORMATO DE SALIDA:

- Código TypeScript limpio
- Comentarios explicativos
- Logs de cambios
- Lista de archivos modificados

```

---

**Documento creado:** 16 de Enero, 2026
**Autor:** SuperNinja AI
**Estado:** Listo para usar
**Versión:** 1.0
```

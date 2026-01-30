# Guía de migración a SVG para Quintas CRM

## Objetivo

Reemplazar el mapa interactivo basado en **Mapbox GL JS** por un mapa SVG nativo que:

- Elimine dependencias externas de mapas.
- Permita usar el plano real del proyecto.
- Se integre con la información de lotes almacenada en Directus y MySQL.

## Estado actual

- Frontend: Next.js 14 + TypeScript + Tailwind CSS.
- Backend: Directus (puerto 8055).
- Base de datos: MySQL 8.0.
- Mapa actual: `MapaInteractivo` usando Mapbox (en proceso de sustitución).
- Datos de lotes: ~50 lotes con coordenadas UTM.

## Estructura nueva para SVG

En `frontend/` se ha creado la siguiente estructura:

- `components/mapa-svg/`
  - `MapaSVGInteractivo.tsx`
  - `SVGLoteLayer.tsx`
  - `PanelLote.tsx`
  - `Leyenda.tsx`
  - `ControlesMapa.tsx`
  - `FiltrosMapa.tsx`
- `lib/svg/`
  - `svg-utils.ts`
  - `svg-mapper.ts`
- `types/svg.ts`
- `public/mapas/`
  - `mapa-quintas.svg`

## Fases propuestas de migración

1. **Fase 1 – Preparación (ya implementada)**
   - Crear estructura de componentes SVG.
   - Añadir utilidades para trabajar con SVG.
   - Actualizar `package.json` con nuevas dependencias.
   - Añadir scripts en `/scripts` para análisis y mapeo.

2. **Fase 2 – Integración del plano real**
   - Sustituir `frontend/public/mapas/mapa-quintas.svg` por el plano real exportado desde CAD.
   - Asegurarse de que cada lote tenga un `id` único en el SVG (`<path id="lote-123" />`).

3. **Fase 3 – Mapeo lotes ↔ SVG**
   - Usar `scripts/map-lotes-to-svg.ts` como base para generar un mapeo entre `id` del lote y `id` del path SVG.
   - Guardar ese `svg_path_id` en la base de datos (nueva columna en tabla `lotes`).

4. **Fase 4 – Reemplazo de Mapbox**
   - Adaptar `MapaSVGInteractivo` para leer el SVG real y usar los `svg_path_id`.
   - Desmontar o eliminar el componente `MapaInteractivo` basado en Mapbox.

5. **Fase 5 – Limpieza**
   - Eliminar variables de entorno específicas de Mapbox.
   - Actualizar documentación y remover cualquier referencia residual a Mapbox.

## Consideraciones

- La base de datos no se modifica todavía; los scripts generan solo SQL de ejemplo.
- Directus no se toca; la integración se hará con nuevas columnas/campos cuando se decida.


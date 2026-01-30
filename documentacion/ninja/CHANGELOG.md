# Changelog - Quintas CRM

## 0.2.0 - Migración inicial a SVG (estructura)

- Añadida estructura de componentes SVG en `frontend/components/mapa-svg/`.
- Añadidas utilidades SVG en `frontend/lib/svg/`.
- Creado archivo de tipos `frontend/types/svg.ts`.
- Añadido `frontend/public/mapas/mapa-quintas.svg` como placeholder inicial.
- Actualizado `frontend/package.json`:
  - Eliminadas dependencias: `mapbox-gl`, `@types/mapbox-gl`, `proj4`.
  - Añadidas dependencias: `react-svg`, `xml2js`, `@types/xml2js`.
- Añadidos scripts de utilidad en `/scripts`:
  - `analyze-svg.ts`
  - `map-lotes-to-svg.ts`
  - `prepare-db-update.ts`
- Documentación actualizada:
  - `README.md` con sección de migración a SVG.
  - `MIGRATION-SVG.md` con guía de migración.

## 0.1.0 - Versión inicial

- Backend Directus configurado en la raíz del proyecto.
- Frontend Next.js 14 con TypeScript y Tailwind en `frontend/`.
- Mapa interactivo inicial basado en Mapbox GL JS.
- Tipos y cliente de API para lotes (`frontend/types/lote.ts`, `frontend/lib/directus-api.ts`).


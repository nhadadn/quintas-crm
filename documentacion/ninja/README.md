# Quintas CRM

![Status](https://img.shields.io/badge/Estado-Transición%20Fase%203-blue)
![Tests](https://img.shields.io/badge/Tests-Passing-success)
![Version](https://img.shields.io/badge/Versión-0.2.9-green)

Sistema de gestión para Quintas de Otinapa, integrando un backend headless (Directus) y un frontend moderno con Next.js y mapas interactivos.

## ✨ Características Principales (Actualizado)

### 🧠 Backend (Business Logic Layer)
- **Validación Robusta**: Suite de pruebas automatizada (`npm test`) para flujos críticos.
- **Automatización**: Triggers para gestión de estados de lotes, generación de amortizaciones y cálculo de comisiones.
- **Seguridad**: Rate limiting, protección SQLi y validación de contextos JWT.

### 🎨 Frontend
- **Mapa Interactivo (En Migración)**: Transición de Mapbox a **SVG Nativo** para mejor rendimiento y control.
- **Gestión Integral**: Módulos para ventas, clientes, pagos y comisiones.

## 🚀 Tecnologías

### Backend
- **Directus CMS**: Headless CMS para gestión de datos y usuarios.
- **Base de Datos**: (Configurada en Directus, por defecto SQLite/PostgreSQL según entorno).

### Frontend
- **Next.js 14**: Framework de React con App Router.
- **TypeScript**: Tipado estático robusto.
- **Tailwind CSS**: Estilos utilitarios.
- **Mapbox GL JS**: Mapas interactivos de alto rendimiento.
- **Axios**: Cliente HTTP para comunicación con Directus.

## 📋 Requisitos Previos

- Node.js (v18 o superior)
- npm o yarn
- Una instancia de Directus corriendo
- Token de acceso de Mapbox (para el frontend)

## 🛠️ Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd quintas-crm
```

### 2. Configurar el Backend (Directus)
El backend se encuentra en la raíz del proyecto.

```bash
# Instalar dependencias
npm install

# Iniciar Directus
npx directus start
```
El backend estará disponible en `http://localhost:8055`.

### 3. Configurar el Frontend
El frontend se encuentra en la carpeta `frontend/`.

```bash
cd frontend

# Instalar dependencias
npm install
```

#### Variables de Entorno
Crea un archivo `.env.local` en la carpeta `frontend/` con las siguientes variables:

```env
NEXT_PUBLIC_DIRECTUS_URL=http://localhost:8055
NEXT_PUBLIC_MAPBOX_TOKEN=tu_token_de_mapbox_aqui
```

### 4. Ejecutar el Frontend

```bash
# Desde la carpeta frontend
npm run dev
```
El frontend estará disponible en `http://localhost:3000` (o 3001 si el puerto está ocupado).

## 🗺️ Migración a SVG

Actualmente el proyecto está en proceso de migrar de **Mapbox GL JS** a un mapa basado en **SVG nativo**.

- Nuevo contenedor principal del mapa: `frontend/components/mapa-svg/MapaSVGInteractivo.tsx`
- Componentes auxiliares:
  - `SVGLoteLayer.tsx` para dibujar lotes dentro del SVG
  - `PanelLote.tsx` para mostrar detalles del lote seleccionado
  - `Leyenda.tsx` para mostrar estatus y colores
  - `ControlesMapa.tsx` para controles de zoom u otros
  - `FiltrosMapa.tsx` para filtros de búsqueda (placeholder inicial)
- Utilidades SVG:
  - `frontend/lib/svg/svg-utils.ts`
  - `frontend/lib/svg/svg-mapper.ts`
- Tipos específicos para SVG:
  - `frontend/types/svg.ts`
- Mapa base:
  - `frontend/public/mapas/mapa-quintas.svg` (actualmente un placeholder)

### Dependencias relacionadas con la migración

- Eliminadas: `mapbox-gl`, `@types/mapbox-gl`, `proj4`
- Añadidas: `react-svg`, `xml2js`, `@types/xml2js`

### Scripts de utilidad (nivel root)

En la carpeta `scripts/` se han añadido utilidades para trabajar con el SVG:

- `scripts/analyze-svg.ts`: analiza el archivo `mapa-quintas.svg`.
- `scripts/map-lotes-to-svg.ts`: ejemplo de mapeo entre lotes y `path` de SVG.
- `scripts/prepare-db-update.ts`: genera sentencias SQL de ejemplo para actualizar la base de datos (no ejecuta nada).

Ejemplos de ejecución en PowerShell:

```pwsh
cd C:\Users\nadir\quintas-crm

# Analizar el SVG
node --loader ts-node/esm .\scripts\analyze-svg.ts

# Generar mapeo de lotes a paths SVG
node --loader ts-node/esm .\scripts\map-lotes-to-svg.ts

# Preparar SQL para actualizar la base de datos
node --loader ts-node/esm .\scripts\prepare-db-update.ts
```

> Nota: para ejecutar scripts TypeScript directamente con Node se recomienda instalar `ts-node` o `tsx` en el futuro.

## 🗺️ Estructura del Proyecto

```
quintas-crm/
├── extensions/         # Extensiones personalizadas de Directus
├── uploads/            # Archivos subidos (ignorado en git)
├── frontend/           # Aplicación Next.js
│   ├── app/            # Rutas y layouts (App Router)
│   ├── components/     # Componentes React (MapaInteractivo, etc.)
│   ├── lib/            # Utilidades y cliente API (directus-api.ts)
│   ├── types/          # Definiciones de tipos TypeScript (lote.ts, mapa.ts)
│   └── public/         # Archivos estáticos
└── README.md           # Documentación del proyecto
```

## 🔐 Seguridad
Asegúrate de no subir archivos `.env` o claves privadas al repositorio. El archivo `.gitignore` está configurado para excluir estos archivos sensibles.

# Quintas CRM

Sistema de gestión para Quintas de Otinapa, integrando un backend headless (Directus) y un frontend moderno con Next.js y mapas interactivos.

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

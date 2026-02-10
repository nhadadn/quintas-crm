# Análisis y Documentación de DevOps - Quintas CRM

**Fecha:** 3 de Febrero de 2026
**Versión:** 1.0.0
**Estado:** Implementado y Operativo

## 1. Resumen Ejecutivo

Este documento detalla la infraestructura, pipelines de CI/CD, contenedorización y herramientas de automatización implementadas para el proyecto Quintas CRM. El sistema sigue una arquitectura basada en microservicios contenerizados, orquestados mediante Docker Compose y gestionados a través de GitHub Actions.

## 2. Stack Tecnológico y Versiones

| Componente        | Herramienta          | Versión  | Propósito                                           |
| ----------------- | -------------------- | -------- | --------------------------------------------------- |
| **Orquestación**  | Docker Compose       | v2.x     | Gestión de servicios locales y producción           |
| **Backend CMS**   | Directus             | 11.14.0  | API Headless y gestión de datos                     |
| **Frontend**      | Next.js              | 14.2.0   | Interfaz de usuario y SSR                           |
| **Base de Datos** | MySQL / PostgreSQL   | 8.0 / 15 | Persistencia de datos (MySQL en host, PG soportado) |
| **Caché**         | Redis                | 7-alpine | Caché de API y colas                                |
| **CI/CD**         | GitHub Actions       | N/A      | Automatización de pruebas y despliegue              |
| **Testing**       | Vitest / Playwright  | Latest   | Pruebas unitarias y E2E                             |
| **Monitoreo**     | Prometheus / Grafana | Latest   | Observabilidad y métricas                           |

## 3. Infraestructura como Código (IaC)

### 3.1 Contenedorización (`docker-compose.yml`)

El archivo `docker-compose.yml` define la arquitectura de servicios interconectados:

- **Directus (`quintas_directus`)**:
  - Conecta a base de datos externa (`host.docker.internal` para MySQL).
  - Volúmenes persistentes para `uploads` y `extensions`.
  - Dependencia de salud (`healthcheck`) con Redis.
- **Redis (`quintas_redis`)**:
  - Imagen Alpine ligera.
  - Healthcheck nativo (`redis-cli ping`).
- **Frontend (`quintas_frontend`)**:
  - Construido desde `frontend/Dockerfile`.
  - Variables de entorno inyectadas para conexión API interna/externa.

### 3.2 Dockerfile Frontend

Ubicación: `frontend/Dockerfile`
Estrategia: **Multi-stage Build** para optimización de imagen final.

1.  **Deps**: Instalación de dependencias (`npm ci`).
2.  **Builder**: Compilación de la aplicación Next.js (`npm run build`).
3.  **Runner**: Imagen `node:18-alpine` mínima, ejecutando solo el output `standalone` de Next.js.

## 4. Pipelines de CI/CD (GitHub Actions)

### 4.1 Integración Continua (`.github/workflows/ci.yml`)

**Trigger:** Push/PR en ramas `main` o `develop` (cambios en `frontend/**` o `extensions/**`).

**Jobs:**

1.  **Frontend Check:**
    - Instala dependencias con caché npm.
    - Linting (`npm run lint`).
    - Verificación de Tipos (`npx tsc --noEmit`).
    - Pruebas Unitarias (`npm run test:unit` con Vitest).
2.  **Docker Build Check:**
    - Verifica que la imagen de Docker pueda construirse exitosamente (sin push).

### 4.2 Despliegue Continuo (`.github/workflows/cd.yml`)

**Trigger:** Creación de Tags semánticos (`v*`).

**Jobs:**

1.  **Build & Push:**
    - Construye la imagen Docker del frontend.
    - Sube la imagen a Docker Hub (`quintas-frontend:latest` y tag de versión).
    - Requiere secretos: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`.
2.  **Deploy (Producción):**
    - Conecta vía SSH al servidor de producción.
    - Ejecuta actualización de contenedores:
      ```bash
      cd /opt/quintas-crm
      docker-compose pull
      docker-compose up -d
      docker system prune -f
      ```
    - Requiere secretos: `PROD_HOST`, `PROD_USERNAME`, `PROD_SSH_KEY`.

## 5. Scripts de Automatización y Mantenimiento

### 5.1 Operaciones Locales (`ops.ps1`)

Script de PowerShell para simplificar el ciclo de vida de desarrollo.

| Comando                 | Descripción                                    |
| ----------------------- | ---------------------------------------------- |
| `.\ops.ps1 -Task dev`   | Levanta entorno de desarrollo (up -d)          |
| `.\ops.ps1 -Task stop`  | Detiene servicios                              |
| `.\ops.ps1 -Task build` | Reconstruye imágenes Docker                    |
| `.\ops.ps1 -Task logs`  | Muestra logs en tiempo real (tail)             |
| `.\ops.ps1 -Task test`  | Ejecuta tests unitarios en contenedor frontend |
| `.\ops.ps1 -Task clean` | Limpieza profunda (volúmenes y huérfanos)      |

### 5.2 Monitoreo (`start-monitoring.ps1`)

Levanta un stack paralelo definido en `monitoring/docker-compose.monitoring.yml` que incluye Prometheus y Grafana para visualizar métricas de contenedores y aplicación.

## 6. Configuración de Entornos

### Variables Requeridas (`.env`)

El sistema requiere un archivo `.env` basado en `.env.template`:

**Backend (Directus):**

- `KEY`, `SECRET`: Claves de seguridad de Directus.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: Credenciales root.
- `DB_CLIENT`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`: Conexión a Base de Datos.
- `REDIS`: URL de conexión a Redis.

**Frontend:**

- `NEXT_PUBLIC_DIRECTUS_URL`: URL pública de API.
- `DIRECTUS_INTERNAL_URL`: URL interna (Docker network).
- `NEXTAUTH_SECRET`: Clave para firma de sesiones JWT.

## 7. Criterios de Éxito del Pipeline

1.  **Calidad de Código:** 0 errores de Linting, 0 errores de TypeScript.
2.  **Pruebas:** 100% de tests unitarios pasando antes de merge.
3.  **Seguridad:** Imágenes Docker construidas sin vulnerabilidades críticas conocidas (base Alpine).
4.  **Disponibilidad:** Despliegue con tiempo de inactividad mínimo (reinicio de contenedores orquestado).
5.  **Trazabilidad:** Cada versión en producción corresponde a un Tag de Git y una imagen inmutable en Docker Hub.

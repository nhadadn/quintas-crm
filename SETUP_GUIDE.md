# Guía de Inicialización del Proyecto (Local sin Docker)

Esta guía detalla los pasos para levantar el proyecto Quintas-CRM en un entorno local de Windows, conectando el Frontend (Next.js) con el Backend (Directus) y una base de datos MySQL local.

## 📋 Prerrequisitos

*   **Node.js**: Versión 20 o superior (Recomendado v22.x).
*   **MySQL**: Instancia local corriendo en el puerto 3306.
*   **Git**: Para clonar el repositorio.

## 🚀 Paso 1: Configuración del Backend (Directus)

El backend maneja la API y la conexión a la base de datos.

1.  **Navegar a la raíz del proyecto**:
    ```powershell
    cd quintas-crm
    ```

2.  **Configurar Variables de Entorno**:
    Asegúrate de que el archivo `.env` en la raíz tenga las credenciales correctas para tu MySQL local.
    ```ini
    # .env
    DB_CLIENT=mysql
    DB_HOST=127.0.0.1
    DB_PORT=3306
    DB_USER=root
    DB_PASSWORD=tu_password_mysql
    DB_DATABASE=quintas_otinapaV2
    
    # Admin User
    ADMIN_EMAIL=admin@quintas.com
    ADMIN_PASSWORD=admin_quintas_2024
    ```

3.  **Instalar Dependencias**:
    ```powershell
    npm install
    ```

4.  **Iniciar Directus**:
    Este comando iniciará el servidor en el puerto 8055.
    ```powershell
    npm start
    ```
    *Esperar a que aparezca "Server started at http://localhost:8055"*

## 💻 Paso 2: Configuración del Frontend (Next.js)

El frontend es el portal web para clientes y administración.

1.  **Abrir una NUEVA terminal** (mantener la del backend abierta).

2.  **Navegar a la carpeta del frontend**:
    ```powershell
    cd frontend
    ```

3.  **Instalar Dependencias**:
    ⚠️ **Importante**: Usar el flag `--legacy-peer-deps` debido a conflictos de versiones en ESLint.
    ```powershell
    npm install --legacy-peer-deps
    ```

4.  **Iniciar Servidor de Desarrollo**:
    ```powershell
    npm run dev
    ```
    *El servidor iniciará en http://localhost:3000*

## 🔑 Credenciales de Acceso

### 1. Panel Administrativo (Directus)
Para gestionar la base de datos, usuarios, y configuraciones globales.
*   **URL**: [http://localhost:8055/admin](http://localhost:8055/admin)
*   **Usuario**: `admin@quintas.com`
*   **Contraseña**: `admin_quintas_2024`

### 2. Portal de Clientes (Frontend)
Para probar la experiencia del usuario final (ver lotes, pagos, perfil).
*   **URL**: [http://localhost:3000/portal/auth/login](http://localhost:3000/portal/auth/login)
*   **Usuario**: `cliente.prueba@quintas.com`
*   **Contraseña**: `Prueba123!`

## 🛠️ Solución de Problemas Comunes

*   **Error "Module not found" en Frontend**: Asegúrate de haber ejecutado `npm install --legacy-peer-deps` dentro de la carpeta `frontend`.
*   **Error de Conexión a Base de Datos**: Verifica que tu servicio de MySQL esté corriendo y que las credenciales en el archivo `.env` (raíz) coincidan con tu configuración local.
*   **Puerto Ocupado**: Si el puerto 8055 o 3000 está ocupado, cierra los procesos anteriores o modifica el puerto en los scripts de inicio.

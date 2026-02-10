# Guía de Pruebas Manuales - Flujo de Autenticación Portal Clientes (Sprint 5.2)

Esta guía detalla los pasos para verificar manualmente el flujo de autenticación del Portal de Clientes.

## Prerrequisitos

1.  **Base de Datos**: Asegurarse de que las migraciones y seed data se han ejecutado.
    - Script: `npm run db:migrate` (o equivalente)
    - Verificación: Ejecutar `node tests/verify_seed_data.js` y confirmar que el usuario `cliente.prueba@quintas.com` existe.
2.  **Servidor**: El frontend debe estar corriendo.
    - Comando: `npm run dev` en la carpeta `frontend`.

## Escenarios de Prueba

### 1. Acceso a Página de Login

- **Acción**: Navegar a `http://localhost:3000/portal/auth/login`.
- **Resultado Esperado**:
  - Se muestra el formulario de inicio de sesión.
  - Título: "Bienvenido a tu Portal".
  - Campos: Email y Contraseña.
  - Enlace "¿Olvidaste tu contraseña?".

### 2. Validación de Campos

- **Acción**: Intentar iniciar sesión con campos vacíos.
- **Resultado Esperado**:
  - El navegador muestra alertas de "Campo requerido" (validación HTML5).
  - No se envía el formulario.

### 3. Credenciales Inválidas

- **Acción**: Ingresar `cliente.prueba@quintas.com` / `passwordIncorrecto` y dar click en "Iniciar Sesión".
- **Resultado Esperado**:
  - Aparece mensaje de error en rojo: "Credenciales inválidas.".
  - Se mantiene en la página de login.

### 4. Login Exitoso

- **Acción**: Ingresar `cliente.prueba@quintas.com` / `Prueba123!` y dar click en "Iniciar Sesión".
- **Resultado Esperado**:
  - Redirección exitosa a `/portal`.
  - Se muestra el Dashboard del cliente.

### 5. Protección de Rutas (Middleware)

- **Acción**:
  1.  Cerrar sesión (o abrir ventana incógnito).
  2.  Intentar navegar directamente a `http://localhost:3000/portal`.
- **Resultado Esperado**:
  - Redirección automática a `/portal/auth/login`.

### 6. Flujo de "Olvidé mi contraseña"

- **Acción**: Click en "¿Olvidaste tu contraseña?".
- **Resultado Esperado**:
  - Navegación a `/portal/auth/forgot-password`.
  - Formulario para ingresar email.

## Troubleshooting

- **Error 404 en Login**: Verificar `frontend/lib/auth.config.ts` y asegurar que `pages.signIn` apunta a `/portal/auth/login`.
- **Loop de Redirección**: Verificar lógica en `middleware.ts` y `auth.config.ts`.
- **Error 500 al hacer Login**: Verificar conexión a base de datos y logs de la terminal de Next.js.

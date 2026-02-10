# Quintas de Otinapa - Frontend ERP

Este repositorio contiene la aplicación frontend del ERP inmobiliario Quintas de Otinapa, construida con Next.js 14, Tailwind CSS y TypeScript.

## 🚀 Portal de Clientes

El Portal de Clientes es una interfaz segura y dedicada para que los compradores puedan consultar el estado de sus lotes, plan de pagos y descargar documentación.

### Acceso

El portal es accesible en: `/portal`

**Rutas Principales:**

- `/portal/auth/login`: Inicio de sesión.
- `/portal/dashboard`: Resumen general.
- `/portal/pagos`: Historial y calendario de pagos.
- `/portal/perfil`: Datos personales y cambio de contraseña.

### Credenciales de Prueba (Ambiente Desarrollo)

| Rol         | Email                        | Password     |
| :---------- | :--------------------------- | :----------- |
| **Cliente** | `cliente.prueba@quintas.com` | `Prueba123!` |

### Troubleshooting Común

**Error: "Acceso Denegado" al intentar loguearse**

- Verifique que su usuario tenga el rol "Cliente" en Directus.
- Asegúrese de no estar intentando ingresar con una cuenta de Administrador o Vendedor.

**Error: "Demasiados intentos"**

- El sistema bloquea el acceso por 15 minutos después de 5 intentos fallidos. Espere o contacte a soporte.

**No veo mis lotes/ventas**

- El sistema utiliza Row-Level Security. Asegúrese de que la venta esté asignada correctamente a su ID de cliente en el backend.

## 🛠️ Desarrollo

### Instalación

```bash
npm install
```

### Ejecución

```bash
npm run dev
```

### Tests

```bash
# Unitarios
npm run test:unit

# E2E (Playwright)
npm run test:e2e
```

## 🔐 Seguridad

Consulte la documentación detallada en `docs/security/`:

- [Roles y Permisos](docs/security/roles-permissions.md)
- [Middleware](docs/security/middleware.md)
- [Flujo de Autenticación](docs/security/auth-flow.md)

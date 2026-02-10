# Guía de Contribución

¡Gracias por tu interés en contribuir al ERP Inmobiliario Quintas de Otinapa!

## 1. Flujo de Trabajo (Git Flow)

Utilizamos una variante simplificada de Git Flow:

- **`main`**: Rama de producción. Código estable y desplegado.
- **`develop`**: Rama de integración. Aquí se fusionan las nuevas características.
- **`feature/nombre-feature`**: Ramas para nuevas funcionalidades. Se crean desde `develop`.
- **`fix/nombre-bug`**: Ramas para corrección de errores.
- **`hotfix/nombre-critico`**: Ramas para errores críticos en producción (se crean desde `main`).

### Proceso de Pull Request (PR)

1.  Asegúrate de que tu rama está actualizada con `develop`.
2.  Crea un PR describiendo los cambios, capturas de pantalla (si aplica) y tickets relacionados.
3.  El PR debe pasar los checks de CI (Lint, Build, Tests).
4.  Requiere al menos 1 aprobación de otro desarrollador.
5.  **Documentación**: Si tu cambio afecta la API o la arquitectura, actualiza los archivos correspondientes en `/ninja`.

## 2. Estándares de Código

### Frontend (Next.js / React)
- **Componentes**: PascalCase (`MiComponente.tsx`).
- **Hooks**: camelCase con prefijo use (`useAuth.ts`).
- **Estilos**: Tailwind CSS. Evitar CSS modules si es posible.
- **Estado**: Preferir estado local o React Context. Usar Zustand para estado global complejo.

### Backend (Directus / Node.js)
- **Extensiones**: Seguir la estructura modular de Directus.
- **Endpoints**: Kebab-case para URLs (`/mis-ventas`).
- **Errores**: Usar códigos HTTP estándar (200, 400, 401, 404, 500).

## 3. Conventional Commits

Recomendamos usar [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: agregar nueva vista de dashboard`
- `fix: corregir cálculo de comisiones`
- `docs: actualizar diagrama de arquitectura`
- `style: formato de código (sin cambios de lógica)`
- `refactor: reestructuración de código`

## 4. Reporte de Bugs

Al reportar un bug, por favor incluye:
- Pasos para reproducir.
- Comportamiento esperado vs actual.
- Capturas de pantalla o logs.
- Entorno (Local, Dev, Prod).

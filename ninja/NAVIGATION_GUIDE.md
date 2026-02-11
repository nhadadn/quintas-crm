# 🧭 Guía de Navegación y Ruta de Aprendizaje (Onboarding)

Esta guía está diseñada para que consultores (Frontend, Backend, Full Stack, QA y DevOps) adquieran el contexto completo del proyecto de manera eficiente y escalonada.

## 📍 Paso 0: Punto de Entrada (Obligatorio)

*   **Documento:** [`README.md`](./README.md)
*   **Por qué leerlo:** Es el índice maestro. Contiene la visión general del propósito del proyecto (ERP Inmobiliario), la estructura de carpetas oficial y el mapa de navegación hacia el resto de la documentación técnica.
*   **Meta:** Entender *qué* es el sistema y *dónde* está cada cosa.

---

## 🚀 Fase 1: Contexto y Arquitectura (Día 1)

Antes de tocar una línea de código, debes entender cómo interactúan las piezas.

1.  **[`ARCHITECTURE.md`](./ARCHITECTURE.md)**
    *   **Contenido Crítico:** Diagramas de flujo de datos, diagrama C4 de contexto, y el **Catálogo de Módulos Backend** (Hooks, Endpoints, Extensiones).
    *   **Meta:** Entender la relación entre Next.js (Frontend), Directus (Backend/CMS) y servicios externos (Stripe, Meta, WhatsApp).

2.  **[`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md)** y **[`docs/ERD_DIAGRAMS.md`](./docs/ERD_DIAGRAMS.md)**
    *   **Contenido Crítico:** Estructura de tablas (Lotes, Clientes, Ventas, Pagos), relaciones SQL y reglas de integridad.
    *   **Meta:** Comprender el modelo de datos inmobiliario y financiero.

---

## 💻 Fase 2: Desarrollo y Estándares (Día 2)

Para configurar el entorno y empezar a desarrollar features correctamente.

3.  **[`CONTRIBUTING.md`](./CONTRIBUTING.md)**
    *   **Contenido Crítico:** Git Flow (ramas `main`, `develop`, `feature/*`), estándares de código (ESLint, Prettier), convenciones de commits y estructura de Pull Requests.
    *   **Meta:** Aprender cómo colaborar sin romper el build ni ensuciar el historial.

4.  **[`docs/MANUAL_EJECUCION.md`](./docs/MANUAL_EJECUCION.md)**
    *   **Contenido Crítico:** Pasos paso-a-paso para levantar el entorno local (Docker, Node.js), seeds de base de datos y variables de entorno (`.env`).
    *   **Meta:** Tener el proyecto corriendo en `localhost:3000` y el CMS en `localhost:8055`.

---

## 🔧 Fase 3: Profundización Técnica (Día 3+)

Lectura específica según la tarea asignada.

### Si trabajas en Backend/Integraciones:
*   **[`API.md`](./API.md)**: Referencia de endpoints custom y estándar.
*   **[`docs/STRIPE_INTEGRATION.md`](./docs/STRIPE_INTEGRATION.md)**: Flujos de pago, webhooks y manejo de suscripciones.

### Si trabajas en Calidad/QA:
*   **[`TESTING.md`](./TESTING.md)**: Estrategias de pruebas unitarias y E2E.
*   **[`docs/TESTING_STRIPE.md`](./docs/TESTING_STRIPE.md)**: Cómo simular pagos y escenarios de error en pasarela.

---

## 🚢 Fase 4: Operaciones y Mantenimiento

Para entender el ciclo de vida de producción.

5.  **[`DEPLOYMENT.md`](./DEPLOYMENT.md)**
    *   **Contenido Crítico:** Pipelines de CI/CD, scripts de despliegue a producción/staging y **procedimientos de Rollback** en caso de fallo.

6.  **[`CHANGELOG.md`](./CHANGELOG.md)**
    *   **Contenido Crítico:** Historial de versiones y "Breaking Changes" recientes.
    *   **Meta:** Saber qué cambió recientemente para evitar regresiones.

---

## ✅ Checklist de Lectura

Copia este checklist en tu primer Pull Request o tarea de onboarding:

- [ ] Leído `ninja/README.md` (Obligatorio)
- [ ] Leído `ninja/ARCHITECTURE.md` (Obligatorio)
- [ ] Leído `ninja/CONTRIBUTING.md` (Obligatorio)
- [ ] Completado setup con `ninja/docs/MANUAL_EJECUCION.md` (Obligatorio)
- [ ] Leído documentación específica del rol (Backend/QA/Frontend)

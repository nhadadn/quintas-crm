# Quintas-CRM: ERP Inmobiliario

> Sistema de gestión integral para desarrollos inmobiliarios campestres.

![Status](https://img.shields.io/badge/Status-Active-success)
![Version](https://img.shields.io/badge/Version-2.0-blue)
![Stack](https://img.shields.io/badge/Stack-Directus%20%2B%20Next.js-blueviolet)

## 📋 Descripción

Quintas-CRM es una plataforma robusta diseñada para administrar el ciclo de vida completo de ventas inmobiliarias, desde la gestión de prospectos y lotes hasta la formalización de contratos y seguimiento de pagos.

## 🚀 Inicio Rápido

### Requisitos Previos
*   Node.js v20+
*   Docker (opcional, para base de datos)
*   MySQL 8.0

### Instalación

1.  **Clonar repositorio:**
    ```bash
    git clone <repo-url>
    cd quintas-crm
    ```

2.  **Backend (Directus):**
    ```bash
    npm install
    npx directus bootstrap # Primer inicio
    npx directus start
    ```

3.  **Frontend (Next.js):**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

## 📚 Documentación Ninja

Toda la documentación técnica esencial, guías de contribución y arquitectura se encuentra centralizada en la carpeta `/ninja`.

*   🥷 **[Documentación Maestra](/ninja/README.md)**: Índice y mapa de toda la documentación.
*   🏗️ **[Arquitectura](/ninja/ARCHITECTURE.md)**: Diagramas C4 y diseño de sistema.
*   🔌 **[API](/ninja/API.md)**: Referencia de endpoints y autenticación.
*   🤝 **[Contribuir](/ninja/CONTRIBUTING.md)**: Guías de estilo y flujo de trabajo.
*   🚀 **[Despliegue](/ninja/DEPLOYMENT.md)**: Guías de deploy e infraestructura.
*   🧪 **[Testing](/ninja/TESTING.md)**: Estrategias de prueba.
*   📝 **[Changelog](/ninja/CHANGELOG.md)**: Historial de cambios.

## 🗺️ Roadmap Actual

*   ✅ **Fase 1-3:** Core CRM (Backend & DB)
*   🟡 **Fase 4:** Dashboards y Reportes (En Auditoría)
*   🔵 **Fase 5:** Portal de Clientes (En Desarrollo)
*   🟣 **Fase 7:** Testing Automatizado (Planeación)
*   🟣 **Fase 8:** Deployment (Planeación)

## 🛠️ Stack Tecnológico

*   **Backend:** Directus 11.14.0 (Node.js)
*   **Frontend:** Next.js 16.1 (App Router)
*   **Auth:** NextAuth.js v5 + Directus Auth
*   **DB:** MySQL 8.0

---
*Documentación generada automáticamente por Agente de Documentación - Febrero 2026*

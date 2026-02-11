# Documentación Ninja - ERP Inmobiliario

Esta carpeta `/ninja` contiene la documentación técnica maestra del proyecto Quintas CRM. Es la fuente de verdad para desarrolladores y consultores.

## 🗂️ Índice de Documentación

| Archivo | Propósito Crítico | Enlace Directo |
| :--- | :--- | :--- |
| **README.md** | Mapa de documentación y guía de uso. | [Ver aquí](./README.md) |
| **NAVIGATION_GUIDE.md** | 🧭 **Ruta de Aprendizaje** (Onboarding para nuevos devs) | [Ver aquí](./NAVIGATION_GUIDE.md) |
| **CONTRIBUTING.md** | Guía para colaboradores: Git Flow y estándares. | [Ver aquí](./CONTRIBUTING.md) |
| **CHANGELOG.md** | Historial de versiones y cambios notables. | [Ver aquí](./CHANGELOG.md) |
| **ARCHITECTURE.md** | Diseño del sistema, diagramas C4 y decisiones técnicas. | [Ver aquí](./ARCHITECTURE.md) |
| **API.md** | Documentación de endpoints REST, esquemas y auth. | [Ver aquí](./API.md) |
| **DEPLOYMENT.md** | Guía de infraestructura, variables de entorno y despliegue. | [Ver aquí](./DEPLOYMENT.md) |
| **TESTING.md** | Estrategia de pruebas y ejecución de tests. | [Ver aquí](./TESTING.md) |
| **docs/** | 📚 **Guías Especializadas** (Stripe, DB Schema, ERD, etc.) | [Explorar](./docs/) |
| **archive/** | 📦 **Archivo Histórico** (Documentación antigua y reportes) | [Explorar](./archive/) |

---

## 🔍 Guía de Mantenimiento y Calidad

Esta sección establece los estándares para mantener esta documentación actualizada.

### 1. Estructura de Contenido Requerida

Cada archivo crítico debe seguir una estructura predefinida para garantizar consistencia.

#### `README.md` (Raíz)
- **Título del Proyecto & Badge de Estado** (Build, Coverage).
- **Resumen Ejecutivo**: ¿Qué hace el sistema? (Max 3 líneas).
- **Tecnologías Clave**: Lista rápida (Next.js, Directus, PostgreSQL).
- **Prerrequisitos**: Node version, Docker, etc.
- **Inicio Rápido**: Comandos para levantar el entorno local en < 5 minutos.
- **Índice de Documentación**: Enlaces a `/ninja`.

#### `ARCHITECTURE.md`
- **Diagrama de Contexto**: Frontend <-> Backend <-> Servicios Externos (Stripe, etc.).
- **Decisiones de Diseño**: Por qué se eligió X librería o patrón (ADRs - Architecture Decision Records).
- **Modelo de Datos**: Diagramas ERD simplificados o enlace a documentación de esquema.
- **Flujos Críticos**: Explicación de flujos complejos (ej. Proceso de Venta/Wizard).

#### `API.md`
- **Autenticación**: Cómo obtener y renovar tokens.
- **Base URL**: URLs para Dev, Staging, Prod.
- **Endpoints Clave**: Agrupados por dominio (Ventas, Clientes, Pagos).
- **Manejo de Errores**: Lista de códigos de error estándar y su significado.

#### `DEPLOYMENT.md`
- **Variables de Entorno**: Tabla con todas las ENVs requeridas, descripción y si son secretas.
- **Proceso de CI/CD**: Descripción de pipelines (GitHub Actions).
- **Infraestructura**: Recursos necesarios (Neon DB, AWS S3, etc.).
- **Rollback**: Pasos exactos para revertir un despliegue fallido.

### 2. Criterios de Calidad

Para considerar que la documentación es válida y útil, debe cumplir con:

1.  **Actualidad**: La documentación debe reflejar la versión actual del código en la rama `main`. *Si el código cambia, la documentación cambia en el mismo PR.*
2.  **Ejecutabilidad**: Los ejemplos de código y comandos deben ser funcionales (copiar-pegar-ejecutar).
3.  **Visualización**: Usar diagramas (Mermaid.js) para flujos lógicos complejos. No solo texto.
4.  **Navegabilidad**: Todos los archivos de más de 1 screen de largo deben tener Tabla de Contenidos (TOC).
5.  **Idioma**: Español para explicaciones, Inglés para términos técnicos estándar y código.

### 3. Checklist de Validación para Consultores

Antes de iniciar cualquier nueva característica o sprint, el consultor debe verificar:

- [ ] ¿El `README.md` permite levantar el proyecto sin errores externos?
- [ ] ¿`ARCHITECTURE.md` describe correctamente los módulos que voy a tocar?
- [ ] ¿Las variables de entorno nuevas están documentadas en `DEPLOYMENT.md`?
- [ ] ¿`CHANGELOG.md` tiene la última versión liberada?
- [ ] ¿Existen diagramas actualizados para los flujos críticos afectados?

*Si alguna respuesta es "No", la tarea prioritaria es actualizar la documentación antes de escribir código.*

### 4. Proceso de Mantenimiento

La documentación es un "ser vivo" y debe evolucionar con el código.

#### Cuándo Actualizar
- **Nuevas Features**: Actualizar `README.md` (si aplica), `API.md` y `CHANGELOG.md`.
- **Refactorización**: Actualizar `ARCHITECTURE.md`.
- **Bug Fixes**: Registrar en `CHANGELOG.md`.
- **Cambios de Configuración**: Actualizar `DEPLOYMENT.md` obligatoriamente.

#### Flujo de Trabajo
1.  **Rama de Feature**: Realizar cambios de código y documentación en la misma rama.
2.  **Pull Request**: El PR debe incluir cambios en `.md` si hubo cambios funcionales.
3.  **Review**: El revisor debe bloquear el PR si la documentación está desactualizada o falta.
4.  **Merge**: Al fusionar a `main`, la documentación se considera la "Verdad Única".

- Revisar que los diagramas sigan siendo fieles a la implementación.
- Archivar documentación obsoleta (mover a `/docs/archive/`).

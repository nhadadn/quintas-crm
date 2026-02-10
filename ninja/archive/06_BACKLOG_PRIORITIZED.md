# Backlog Priorizado - Quintas-CRM

Este backlog consolida las tareas pendientes de las Fases 5 y 6, así como la deuda técnica acumulada.

## Prioridad Alta (Q1 - Semanas 1-2)

_Crítico para el lanzamiento del Portal de Clientes._

| ID        | Tarea                                      | Fase | Esfuerzo | Dependencia   |
| --------- | ------------------------------------------ | ---- | -------- | ------------- |
| **BK-01** | Configurar NextAuth con Directus           | F5   | 3 pts    | N/A           |
| **BK-02** | Implementar Login/Logout UI                | F5   | 2 pts    | BK-01         |
| **BK-03** | Crear Rol "Cliente" y Permisos en Directus | F5   | 2 pts    | N/A           |
| **BK-04** | Endpoint `GET /perfil` (Mis Datos)         | F5   | 3 pts    | BK-03         |
| **BK-05** | Vista "Estado de Cuenta" en Portal         | F5   | 5 pts    | BK-01, Fase 4 |

## Prioridad Media (Q1 - Semanas 3-4)

_Mejoras de experiencia y automatización._

| ID        | Tarea                                   | Fase | Esfuerzo | Dependencia |
| --------- | --------------------------------------- | ---- | -------- | ----------- |
| **BK-06** | Sistema de Notificaciones Email (Hooks) | F6   | 8 pts    | N/A         |
| **BK-07** | Descarga de PDFs desde Portal           | F5   | 3 pts    | Fase 4      |
| **BK-08** | Recuperación de Contraseña (Flow)       | F5   | 5 pts    | BK-06       |
| **BK-09** | Webhooks para CRM externo               | F6   | 5 pts    | N/A         |

## Prioridad Baja / Deuda Técnica

_Mantenimiento y optimización._

| ID        | Tarea                                  | Tipo        | Esfuerzo | Notas                                    |
| --------- | -------------------------------------- | ----------- | -------- | ---------------------------------------- |
| **DT-01** | Migrar Backend Extensions a TypeScript | Tech Debt   | 13 pts   | Riesgo de regresión.                     |
| **DT-02** | Implementar Unit Tests (Jest)          | QA          | 8 pts    | Cobertura crítica: Cálculos financieros. |
| **DT-03** | Cache Layer con Redis                  | Performance | 5 pts    | Si aumenta tráfico.                      |
| **DT-04** | Swagger/OpenAPI Auto-gen               | Docs        | 3 pts    | Para integradores.                       |

**Leyenda de Esfuerzo:** 1 (Trivial) - 13 (Muy Complejo)

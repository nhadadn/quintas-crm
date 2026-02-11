# Análisis de Cobertura de Código

## Resumen Ejecutivo

- **Frontend**: 87.87% (Statements) - ✅ Objetivo cumplido (>80%)
- **Backend**: 59.25% (Statements) - ⚠️ Requiere mejora
- **Total Combinado**: ~70% (Estimado)

## Detalle Frontend

| Archivo | % Stmts | % Branch | % Funcs | Estado |
|---------|---------|----------|---------|--------|
| `lib/auth-actions.ts` | 90.74% | 74.19% | 100% | ✅ |
| `components/stripe/PaymentForm.tsx` | 82.75% | 68.42% | 66.66% | ✅ |
| `app/portal/(dashboard)/pagos/page.tsx` | 73.33% | 63.63% | 100% | ⚠️ Mejorar |
| `components/portal/pagos/TablaPagosCliente.tsx` | 74.74% | 71.42% | 56.25% | ⚠️ Mejorar |
| `components/portal/ErrorMessage.tsx` | 0% | 0% | 0% | 🔴 Crítico |

## Detalle Backend

| Archivo | % Stmts | % Branch | % Funcs | Estado |
|---------|---------|----------|---------|--------|
| `extensions/amortizacion` | 93.33% | 100% | 100% | ✅ |
| `extensions/comisiones` | 86.66% | 68.75% | 75% | ✅ |
| `extensions/directus-endpoint-lotes` | 67.77% | 47.82% | 71.42% | ⚠️ Mejorar |
| `extensions/directus-extension-hook-crm-logic` | 66.66% | 46.26% | 69.23% | ⚠️ Mejorar |
| `extensions/endpoint-pagos` | 62.04% | 53.37% | 50% | ⚠️ Mejorar |
| `extensions/ventas-api` | 59.61% | 40.22% | 55.55% | 🔴 Prioridad |
| `extensions/analytics-custom` | 53.71% | 34.78% | 80% | 🔴 Prioridad |
| `extensions/clientes` | 23.13% | 18.96% | 14.28% | 🔴 Crítico |

## Plan de Mejora (T7.5.3)

### Prioridad 1: Backend - Clientes Extension
- **Objetivo**: Subir de 23% a >80%.
- **Acción**: Crear tests unitarios para endpoints de clientes (CRUD, validaciones).

### Prioridad 2: Backend - Analytics Custom
- **Objetivo**: Subir de 53% a >80%.
- **Acción**: Mejorar tests de `kpi-dashboard` para cubrir más casos de uso y ramas.

### Prioridad 3: Backend - Ventas API
- **Objetivo**: Subir de 59% a >80%.
- **Acción**: Agregar tests para endpoints de creación y validación de ventas.

### Prioridad 4: Frontend - Componentes Faltantes
- **Objetivo**: Cubrir `ErrorMessage.tsx` y mejorar `TablaPagosCliente.tsx`.
- **Acción**: Agregar tests de renderizado y lógica de UI.

## Conclusión
El backend es el cuello de botella actual para alcanzar la meta global del 80%. Se priorizará la creación de tests para las extensiones de Directus con menor cobertura.

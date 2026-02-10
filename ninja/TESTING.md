# Estrategia de Pruebas (Testing)

## 1. Niveles de Pruebas

### 1.1 Pruebas Unitarias (Jest)
- **Objetivo**: Validar lógica de negocio aislada.
- **Ubicación**: Junto al archivo fuente (`*.test.ts`) o en `__tests__`.
- **Cobertura**: Utilidades de cálculo (comisiones, amortizaciones), hooks personalizados.

### 1.2 Pruebas de Integración
- **Objetivo**: Validar comunicación entre módulos (Frontend <-> Backend).
- **Herramientas**: Jest + React Testing Library / Supertest (Backend).
- **Alcance**: Flujos de API, Componentes complejos (Wizard de Venta).

### 1.3 Pruebas E2E (Playwright - *Pendiente*)
- **Objetivo**: Simular flujos de usuario completos en navegador real.
- **Escenarios Críticos**:
    - Login de usuario.
    - Creación de una venta completa.
    - Visualización del Dashboard.

## 2. Ejecución de Pruebas

```bash
# Ejecutar todas las pruebas unitarias
npm test

# Ejecutar pruebas en modo watch
npm run test:watch

# Generar reporte de cobertura
npm run test:coverage
```

## 3. Mocking

Para evitar dependencias externas en tests unitarios, utilizamos mocks:

- **Directus SDK**: Mockear llamadas a `client.request`.
- **Axios**: Mockear respuestas HTTP.

Ejemplo de Mock:
```typescript
jest.mock('@directus/sdk', () => ({
  createDirectus: jest.fn(() => ({
    with: jest.fn().mockReturnThis(),
    static: jest.fn().mockReturnThis(),
    request: jest.fn().mockResolvedValue({ data: [] }),
  })),
}));
```

## 4. Referencia de Pruebas Existentes

- `TESTING_STRIPE_E2E.md` (Legacy): Documentación sobre pruebas manuales de integración con Stripe.
- `GUIA_PRUEBAS_MANUALES_INTEGRAL.md`: Scripts de prueba manual para QA.

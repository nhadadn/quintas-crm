# Plan de Verificación y Calidad (QA)

Este documento detalla los pasos para verificar la integridad, funcionalidad y rendimiento del sistema Quintas CRM, enfocándose en las fases T4.5 (Exportación) y T4.6 (Performance).

## 1. Tests Automatizados

### Backend (Endpoints y Lógica)

Se ha creado un script de pruebas de integración para validar los endpoints de Directus.

**Ejecución:**
Asegúrate de que el backend esté corriendo (`npx directus start` o `npm start` en el root) en el puerto 8055.

```bash
node tests/backend/endpoints.test.js
```

**Qué verifica:**

- Disponibilidad de endpoints críticos (`/dashboard/kpis`, `/dashboard/ventas-por-mes`, etc.).
- Estructura correcta de la respuesta JSON.
- Tiempos de respuesta (Performance).
- Comportamiento del Caché (compara tiempos de 1ra vs 2da llamada).

### Frontend (Componentes e Integración)

Se utilizan pruebas E2E/Integración con **Playwright** para verificar la interfaz de usuario.

**Ejecución:**

```bash
cd frontend
npx playwright test tests/dashboard.spec.ts
```

**Qué verifica:**

- Carga correcta del Dashboard Principal.
- Renderizado de tarjetas KPI con datos.
- Visualización de gráficos (lazy loading).
- Interactividad de filtros (selector de periodo).
- Navegación a sub-dashboards (Ventas, Pagos).
- Presencia de opciones de exportación.

_Nota: Los tests de frontend usan mocks de API por defecto para aislar la prueba de la interfaz de la disponibilidad del backend._

## 2. Validación Manual de Requisitos

### Precisión de Cálculos

1. **Exportar Reporte General:** Desde el Dashboard, usar el botón "Exportar" -> "Excel".
2. **Comparar con BD:** Verificar que la suma de "Monto Total" en el Excel coincida con la consulta SQL:
   ```sql
   SELECT SUM(monto_total) FROM ventas WHERE fecha_venta BETWEEN '2024-01-01' AND '2024-01-31';
   ```
3. **KPIs:** Verificar que "Ingresos Cobrados" coincida con:
   ```sql
   SELECT SUM(monto) FROM pagos WHERE estatus = 'pagado';
   ```

### Performance (Métricas Objetivo)

- **Carga de Dashboard:** < 3 segundos. (Verificable en Network tab o output de tests backend).
- **Exportación PDF:** < 5 segundos para ~1000 registros.
- **Exportación Excel:** < 3 segundos.

### Pruebas de Estrés (Opcional)

Para validar concurrencia, usar **k6** o ejecutar el script de backend en bucle:

```bash
for /L %i in (1,1,10) do node tests/backend/endpoints.test.js
```

## 3. Checklist de Entrega

- [x] Componentes de Exportación (PDF, Excel, CSV) integrados.
- [x] Optimización de Consultas (Paralelización en Backend).
- [x] Caching Implementado (TTL 5 min).
- [x] Lazy Loading en Gráficos Frontend.
- [x] Tests de Integración Frontend (Playwright).
- [x] Script de Validación Backend.

## 4. Reporte de Bugs Conocidos

- **Backend:** Si Directus se reinicia, el caché en memoria se pierde (comportamiento esperado).
- **Frontend:** En conexiones muy lentas, los gráficos pueden tardar unos segundos extra en aparecer debido al lazy loading (se muestra spinner).

---

**Responsable QA:** Agent Trae
**Fecha:** 31 Enero 2026

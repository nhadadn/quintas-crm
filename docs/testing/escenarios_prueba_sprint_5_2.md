# Guía de Escenarios de Prueba (E2E y Seguridad)

## 1. Escenario: Ciclo de Vida del Cliente

**Objetivo**: Verificar que un cliente puede acceder y ver solo sus datos.

### Prerrequisitos

- Usuario de prueba: `cliente.prueba@quintas.com` / `Prueba123!`
- Cliente CRM creado y vinculado.

### Pasos de Prueba

1.  **Login**:
    - Acceder a `/login`.
    - Ingresar credenciales.
    - **Resultado Esperado**: Redirección exitosa a `/portal`.
2.  **Visualización de Dashboard**:
    - **Resultado Esperado**: Ver tarjetas de "Mis Lotes", "Próximo Pago".
    - **Validación**: Los datos deben coincidir con los del cliente de prueba.
3.  **Acceso a Documentos**:
    - Ir a sección "Documentos".
    - **Resultado Esperado**: Ver contrato y recibos propios.
    - **Prueba Negativa**: Intentar acceder a URL de documento de otro cliente (si se conoce ID). Debe dar 403.

## 2. Escenario: Seguridad RLS (Row-Level Security)

**Objetivo**: Validar que el aislamiento de datos funciona a nivel de API.

### Prueba de Aislamiento

1.  **Intento de Acceso Cruzado**:
    - Loguearse como `cliente.prueba@quintas.com`.
    - Usar herramienta (Postman/Curl) o consola del navegador.
    - Intentar GET `/items/ventas` sin filtros.
    - **Resultado Esperado**: La API debe devolver SOLO las ventas del usuario (array filtrado), no todas las ventas del sistema.
2.  **Intento de Escritura**:
    - Intentar PATCH `/items/ventas/{id}`.
    - **Resultado Esperado**: Error 403 Forbidden.

## 3. Escenario: Compra de Lote (Simulación)

**Objetivo**: Verificar el flujo de venta y generación de amortización.

### Pasos

1.  **Selección**:
    - Vendedor selecciona Lote "Disponible".
2.  **Asignación**:
    - Asignar a Cliente de Prueba.
    - Configurar: Enganche 10%, Plazo 12 meses, Tasa 10%.
3.  **Confirmación**:
    - Crear Venta.
    - **Validación Automática (Backend)**:
      - Lote cambia a 'apartado' o 'vendido'.
      - Se generan 12 registros en colección `pagos`.
      - Se genera registro en `comisiones`.

## 4. Escenario: Registro de Pago

**Objetivo**: Verificar cálculo de mora y actualización de estatus.

### Pasos

1.  **Pago a Tiempo**:
    - Registrar pago por el monto exacto antes de fecha vencimiento.
    - **Resultado**: Estatus pago = 'pagado', Mora = 0.
2.  **Pago Tardío**:
    - Simular pago 10 días después de vencimiento.
    - **Resultado**: Sistema debe calcular interés moratorio (según configuración).
    - **Validación**: Monto total > Monto original.

## Resultados de Pruebas Automatizadas (Sprint 5.2)

| Componente      | Tipo             | Estado    | Notas                                      |
| :-------------- | :--------------- | :-------- | :----------------------------------------- |
| **Backend API** | Unit/Integration | ✅ PASSED | 14/14 tests (Endpoints, Logic, Security)   |
| **Frontend**    | Linting          | ✅ PASSED | 0 errores, 0 warnings                      |
| **Frontend**    | Build            | ✅ PASSED | Compilación exitosa (Production Optimized) |
| **Cálculos**    | Unit (Frontend)  | ✅ PASSED | Amortización francesa validada             |


### 5. Estado de Cuenta y Reportes

El sistema genera automáticamente el Estado de Cuenta actualizado.

#### Endpoints
- `GET /pagos/estado-cuenta/:venta_id`: JSON con resumen financiero, historial y amortización.
- `GET /pagos/estado-cuenta/:venta_id/pdf`: Descarga el mismo reporte en formato PDF profesional.

#### Contenido del Estado de Cuenta
1.  **Encabezado:** Datos del cliente, contrato y propiedad.
2.  **Resumen Financiero:**
    - Precio Total y Enganche.
    - Saldo Actual (Capital pendiente).
    - Pagos Totales realizados.
    - Penalizaciones pendientes.
3.  **Historial de Pagos:** Lista cronológica de transacciones recibidas.
4.  **Tabla de Amortización:** Detalle de cuotas (vencimiento, capital, interés, estatus).

#### Generación de PDF
Utiliza `jspdf` y `jspdf-autotable` para crear documentos dinámicos con tablas formateadas.

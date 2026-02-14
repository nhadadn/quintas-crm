
### 4. Sistema de Penalizaciones por Morosidad

El sistema calcula automáticamente intereses moratorios para las cuotas vencidas.

#### Configuración
Se gestiona en la tabla `configuracion_penalizaciones`:
- **Tasa Mensual:** Default 1.5%
- **Días de Gracia:** Default 5 días

#### Cálculo Automático (Cron Job)
- Se ejecuta diariamente a las 00:00.
- Fórmula: `Penalización = Cuota * (Tasa Mensual / 30) * (Días Atraso - Días Gracia)`
- Actualiza el campo `penalizacion_acumulada` en la tabla `amortizacion`.
- Registra el historial en la tabla `penalizaciones`.

#### Cobro de Penalizaciones
Al registrar un pago, el sistema prioriza el cobro de deudas en este orden:
1. **Penalizaciones Acumuladas:** Se descuentan primero del monto pagado.
2. **Interés y Capital:** El remanente se aplica a la cuota mensual correspondiente.

**Ejemplo:**
- Cuota: $5,000
- Penalización acumulada: $200
- Pago recibido: $5,200
  - $200 se aplican a penalización.
  - $5,000 se aplican a la cuota (queda pagada).

- Pago recibido: $100
  - $100 se aplican a penalización (restan $100 de deuda moratoria).
  - $0 a la cuota.

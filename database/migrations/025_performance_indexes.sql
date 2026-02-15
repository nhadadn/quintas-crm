-- Migration: 025_performance_indexes.sql
-- Description: Índices críticos de rendimiento y vista v_dashboard_kpis
-- Date: 2026-02-15
-- Notas:
-- - Agrega índice compuesto en ventas para consultas por cliente, vendedor y fecha.
-- - Crea vista v_dashboard_kpis con métricas precalculadas por venta.
-- - La suma de pagos se basa en el ledger pagos_movimientos (excluye cancelados y descuenta reembolsos).

-- =====================================
-- ÍNDICES CRÍTICOS
-- =====================================

-- Ventas: índice compuesto para filtros combinados
ALTER TABLE `ventas`
  ADD INDEX `idx_ventas_cliente_vendedor_fecha` (`cliente_id`, `vendedor_id`, `fecha_venta`);

-- NOTA: Los siguientes índices ya existen en migraciones previas:
--  - pagos_movimientos(venta_id, numero_pago)  -> idx_pagos_mov_venta_numero en 022
--  - amortizacion(venta_id, estatus)           -> idx_amortizacion_venta_status en 016

-- =====================================
-- VISTA v_dashboard_kpis
-- =====================================

DROP VIEW IF EXISTS `v_dashboard_kpis`;
CREATE VIEW `v_dashboard_kpis` AS
WITH
  pagos AS (
    SELECT
      pm.venta_id,
      COALESCE(SUM(
        CASE
          WHEN pm.estatus <> 'cancelado' THEN
            CASE WHEN pm.tipo = 'reembolso' THEN -pm.monto ELSE pm.monto END
          ELSE 0
        END
      ), 0) AS total_pagado
    FROM pagos_movimientos pm
    GROUP BY pm.venta_id
  ),
  vencidos AS (
    SELECT
      a.venta_id,
      COALESCE(SUM(
        CASE
          WHEN a.fecha_vencimiento < CURDATE() AND a.estatus <> 'pagado'
            THEN GREATEST(a.monto_cuota - a.monto_pagado, 0)
          ELSE 0
        END
      ), 0) AS saldo_vencido
    FROM amortizacion a
    GROUP BY a.venta_id
  ),
  proximo AS (
    SELECT
      a.venta_id,
      MIN(CASE WHEN a.estatus <> 'pagado' THEN a.fecha_vencimiento ELSE NULL END) AS proximo_vencimiento
    FROM amortizacion a
    GROUP BY a.venta_id
  )
SELECT
  v.id AS venta_id,
  v.cliente_id,
  v.vendedor_id,
  v.fecha_venta,
  v.estatus,
  v.monto_total AS total_contratado,
  COALESCE(p.total_pagado, 0) AS total_pagado,
  COALESCE(ve.saldo_vencido, 0) AS saldo_vencido,
  pr.proximo_vencimiento
FROM ventas v
LEFT JOIN pagos p
  ON p.venta_id = v.id
LEFT JOIN vencidos ve
  ON ve.venta_id = v.id
LEFT JOIN proximo pr
  ON pr.venta_id = v.id;


-- Migration: 024_dashboard_view.sql
-- Description: Vista optimizada de KPIs por venta para el Dashboard
-- Date: 2026-02-15
-- Notas:
-- - Evita escanear miles de movimientos; usa agregados de amortizacion.
-- - KPIs: total_vendido, total_cobrado, saldo_vencido.
-- - Compatibilidad MySQL/MariaDB.

DROP VIEW IF EXISTS vw_dashboard_kpi_ventas;
CREATE VIEW vw_dashboard_kpi_ventas AS
WITH
  -- Total cobrado por venta a partir de amortizacion (mantenido por triggers)
  cobros AS (
    SELECT
      a.venta_id,
      COALESCE(SUM(a.monto_pagado), 0) AS total_cobrado
    FROM amortizacion a
    GROUP BY a.venta_id
  ),
  -- Saldo vencido por venta: cuotas vencidas no cubiertas totalmente
  vencidos AS (
    SELECT
      a.venta_id,
      COALESCE(
        SUM(
          CASE
            WHEN a.fecha_vencimiento < CURDATE()
                 AND a.estatus IN ('pendiente','parcial','vencido')
            THEN GREATEST(a.monto_cuota - a.monto_pagado, 0)
            ELSE 0
          END
        ),
        0
      ) AS saldo_vencido
    FROM amortizacion a
    GROUP BY a.venta_id
  )
SELECT
  v.id AS venta_id,
  v.monto_total AS total_vendido,
  COALESCE(c.total_cobrado, 0) AS total_cobrado,
  COALESCE(s.saldo_vencido, 0) AS saldo_vencido
FROM ventas v
LEFT JOIN cobros c
  ON c.venta_id = v.id
LEFT JOIN vencidos s
  ON s.venta_id = v.id;


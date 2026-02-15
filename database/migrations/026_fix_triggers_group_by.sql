-- Migration: 026_fix_triggers_group_by.sql
-- Description: Corrige triggers de pagos_movimientos para compatibilidad con ONLY_FULL_GROUP_BY
-- Notas:
-- - Reescribe subconsultas agregadas con GROUP BY (venta_id, numero_pago)
-- - Mantiene lógica de total_pagado y last_abono_fecha

SET NAMES utf8mb4;

-- Eliminar triggers previos
DROP TRIGGER IF EXISTS `trg_pagos_mov_after_insert`;
DROP TRIGGER IF EXISTS `trg_pagos_mov_after_update`;
DROP TRIGGER IF EXISTS `trg_pagos_mov_after_delete`;

-- AFTER INSERT
CREATE TRIGGER `trg_pagos_mov_after_insert`
AFTER INSERT ON `pagos_movimientos`
FOR EACH ROW
  UPDATE `amortizacion` a
  JOIN (
    SELECT
      `venta_id`,
      `numero_pago`,
      COALESCE(SUM(
        CASE
          WHEN `estatus` <> 'cancelado' THEN
            CASE WHEN `tipo` = 'reembolso' THEN -`monto` ELSE `monto` END
          ELSE 0
        END
      ), 0) AS total_pagado,
      MAX(
        CASE
          WHEN `estatus` <> 'cancelado' AND `tipo` = 'abono' THEN `fecha_movimiento`
          ELSE NULL
        END
      ) AS last_abono_fecha
    FROM `pagos_movimientos`
    WHERE `venta_id` = NEW.`venta_id`
      AND `numero_pago` = NEW.`numero_pago`
    GROUP BY `venta_id`, `numero_pago`
  ) agg
    ON a.`venta_id` = agg.`venta_id`
   AND a.`numero_pago` = agg.`numero_pago`
  SET
    a.`monto_pagado` = agg.`total_pagado`,
    a.`estatus` = CASE
      WHEN agg.`total_pagado` <= 0 THEN 'pendiente'
      WHEN agg.`total_pagado` < a.`monto_cuota` THEN 'parcial'
      ELSE 'pagado'
    END,
    a.`fecha_pago` = CASE
      WHEN agg.`total_pagado` >= a.`monto_cuota` THEN agg.`last_abono_fecha`
      ELSE NULL
    END;

-- AFTER UPDATE
CREATE TRIGGER `trg_pagos_mov_after_update`
AFTER UPDATE ON `pagos_movimientos`
FOR EACH ROW
  UPDATE `amortizacion` a
  JOIN (
    SELECT
      `venta_id`,
      `numero_pago`,
      COALESCE(SUM(
        CASE
          WHEN `estatus` <> 'cancelado' THEN
            CASE WHEN `tipo` = 'reembolso' THEN -`monto` ELSE `monto` END
          ELSE 0
        END
      ), 0) AS total_pagado,
      MAX(
        CASE
          WHEN `estatus` <> 'cancelado' AND `tipo` = 'abono' THEN `fecha_movimiento`
          ELSE NULL
        END
      ) AS last_abono_fecha
    FROM `pagos_movimientos`
    WHERE `venta_id` = NEW.`venta_id`
      AND `numero_pago` = NEW.`numero_pago`
    GROUP BY `venta_id`, `numero_pago`
  ) agg
    ON a.`venta_id` = agg.`venta_id`
   AND a.`numero_pago` = agg.`numero_pago`
  SET
    a.`monto_pagado` = agg.`total_pagado`,
    a.`estatus` = CASE
      WHEN agg.`total_pagado` <= 0 THEN 'pendiente'
      WHEN agg.`total_pagado` < a.`monto_cuota` THEN 'parcial'
      ELSE 'pagado'
    END,
    a.`fecha_pago` = CASE
      WHEN agg.`total_pagado` >= a.`monto_cuota` THEN agg.`last_abono_fecha`
      ELSE NULL
    END
  WHERE (OLD.`monto` <> NEW.`monto`
      OR OLD.`tipo` <> NEW.`tipo`
      OR OLD.`estatus` <> NEW.`estatus`);

-- AFTER DELETE
CREATE TRIGGER `trg_pagos_mov_after_delete`
AFTER DELETE ON `pagos_movimientos`
FOR EACH ROW
  UPDATE `amortizacion` a
  JOIN (
    SELECT
      `venta_id`,
      `numero_pago`,
      COALESCE(SUM(
        CASE
          WHEN `estatus` <> 'cancelado' THEN
            CASE WHEN `tipo` = 'reembolso' THEN -`monto` ELSE `monto` END
          ELSE 0
        END
      ), 0) AS total_pagado,
      MAX(
        CASE
          WHEN `estatus` <> 'cancelado' AND `tipo` = 'abono' THEN `fecha_movimiento`
          ELSE NULL
        END
      ) AS last_abono_fecha
    FROM `pagos_movimientos`
    WHERE `venta_id` = OLD.`venta_id`
      AND `numero_pago` = OLD.`numero_pago`
    GROUP BY `venta_id`, `numero_pago`
  ) agg
    ON a.`venta_id` = agg.`venta_id`
   AND a.`numero_pago` = agg.`numero_pago`
  SET
    a.`monto_pagado` = agg.`total_pagado`,
    a.`estatus` = CASE
      WHEN agg.`total_pagado` <= 0 THEN 'pendiente'
      WHEN agg.`total_pagado` < a.`monto_cuota` THEN 'parcial'
      ELSE 'pagado'
    END,
    a.`fecha_pago` = CASE
      WHEN agg.`total_pagado` >= a.`monto_cuota` THEN agg.`last_abono_fecha`
      ELSE NULL
    END;


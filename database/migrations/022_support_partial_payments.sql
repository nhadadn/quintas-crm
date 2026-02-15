-- Migration: 022_support_partial_payments.sql
-- Description: Soportar pagos parciales multiples por cuota usando ledger pagos_movimientos
-- Objetivo: Mover la logica financiera a un ledger por movimiento y derivar amortizacion

SET NAMES utf8mb4;

-- 1) Revertir indice UNIQUE en pagos para permitir multiples registros por cuota
--    El DROP del indice se hace de forma segura para evitar errores si no existe.

SET @idx_name := 'idx_pagos_venta_numero';
SET @tbl_name := 'pagos';
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = @tbl_name
    AND index_name = @idx_name
);

SET @drop_sql := IF(
  @idx_exists > 0,
  CONCAT('ALTER TABLE `', @tbl_name, '` DROP INDEX `', @idx_name, '`'),
  'SELECT 1'
);

PREPARE stmt FROM @drop_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE `pagos`
  ADD INDEX `idx_pagos_venta_numero` (`venta_id`, `numero_pago`);

-- 2) Eliminar trigger en pagos; la logica pasa a pagos_movimientos (ledger)
DROP TRIGGER IF EXISTS `trg_pagos_after_update_propagation`;

-- 3) Crear tabla pagos_movimientos como ledger de transacciones por cuota
CREATE TABLE IF NOT EXISTS `pagos_movimientos` (
  `id` CHAR(36) NOT NULL,
  `pago_id` CHAR(36) NULL COMMENT 'Relacion opcional con tabla pagos (compatibilidad)',
  `venta_id` CHAR(36) NOT NULL,
  `numero_pago` INT NOT NULL,
  `fecha_movimiento` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `monto` DECIMAL(12,2) NOT NULL COMMENT 'Monto positivo; tipo determina el signo efectivo',
  `tipo` VARCHAR(20) NOT NULL DEFAULT 'abono' COMMENT 'abono, reembolso',
  `estatus` VARCHAR(20) NOT NULL DEFAULT 'aplicado' COMMENT 'aplicado, cancelado',
  `stripe_payment_intent_id` VARCHAR(255) NULL,
  `stripe_customer_id` VARCHAR(255) NULL,
  `stripe_last4` VARCHAR(4) NULL,
  `metodo_pago_detalle` JSON NULL,
  `notas` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_pagos_mov_venta_numero` (`venta_id`, `numero_pago`),
  CONSTRAINT `fk_pagos_mov_venta`
    FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pagos_mov_pago`
    FOREIGN KEY (`pago_id`) REFERENCES `pagos`(`id`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enfoque de montos: siempre positivos. El signo logico se deriva de tipo
ALTER TABLE `pagos_movimientos`
  ADD CONSTRAINT `chk_pagos_mov_monto_pos`
    CHECK (`monto` > 0);

-- 3.1) Garantizar unicidad de cuotas en amortizacion y FK compuesta desde el ledger
ALTER TABLE `amortizacion`
  ADD UNIQUE KEY `uq_amortizacion_venta_numero` (`venta_id`, `numero_pago`);

ALTER TABLE `pagos_movimientos`
  ADD CONSTRAINT `fk_pagos_mov_amortizacion`
    FOREIGN KEY (`venta_id`, `numero_pago`)
    REFERENCES `amortizacion`(`venta_id`, `numero_pago`)
    ON DELETE RESTRICT;

-- 4) Triggers en pagos_movimientos para recalcular amortizacion.monto_pagado y estatus

-- Funcion de agregacion derivada (in-line):
-- total_pagado = SUM(monto aplicado) ignorando movimientos cancelados;
-- los reembolsos pueden representarse como tipo='reembolso' o monto negativo.

DROP TRIGGER IF EXISTS `trg_pagos_mov_after_insert`;
DROP TRIGGER IF EXISTS `trg_pagos_mov_after_update`;
DROP TRIGGER IF EXISTS `trg_pagos_mov_after_delete`;

-- Trigger AFTER INSERT: cualquier nuevo movimiento recalcula la cuota
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

-- Trigger AFTER UPDATE: solo se recalcula si cambia monto/tipo/estatus del movimiento
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

-- Trigger AFTER DELETE: recalcula la cuota cuando se elimina un movimiento
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

-- 5) Migracion de datos: por cada fila existente en pagos, crear un movimiento equivalente

INSERT INTO `pagos_movimientos` (
  `id`,
  `pago_id`,
  `venta_id`,
  `numero_pago`,
  `fecha_movimiento`,
  `monto`,
  `tipo`,
  `estatus`,
  `stripe_payment_intent_id`,
  `stripe_customer_id`,
  `stripe_last4`,
  `metodo_pago_detalle`,
  `notas`
)
SELECT
  UUID() AS `id`,
  p.`id` AS `pago_id`,
  p.`venta_id`,
  p.`numero_pago`,
  COALESCE(p.`fecha_pago`, a.`fecha_vencimiento`, NOW()) AS `fecha_movimiento`,
  CASE
    WHEN p.`monto_pagado` IS NOT NULL AND p.`monto_pagado` > 0 THEN p.`monto_pagado`
    ELSE p.`monto`
  END AS `monto`,
  'abono' AS `tipo`,
  CASE
    WHEN p.`estatus` = 'cancelado' THEN 'cancelado'
    ELSE 'aplicado'
  END AS `estatus`,
  p.`stripe_payment_intent_id`,
  p.`stripe_customer_id`,
  p.`stripe_last4`,
  p.`metodo_pago_detalle`,
  p.`notas`
FROM `pagos` p
JOIN `amortizacion` a
  ON a.`venta_id` = p.`venta_id`
 AND a.`numero_pago` = p.`numero_pago`
LEFT JOIN `pagos_movimientos` pm
  ON pm.`pago_id` = p.`id`
WHERE pm.`id` IS NULL;


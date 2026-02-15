-- Migration: 020_fix_status_and_constraints.sql
-- Description: Unificar dominios de estatus en pagos y amortizacion y reforzar clave logica
-- Contexto: Materializar llave logica (venta_id, numero_pago) como restriccion fisica

SET NAMES utf8mb4;

-- 1) Normalizar valores de estatus en pagos
--    Mapeo: 'atrasado' -> 'vencido' para alinearlo con el dominio estandar
UPDATE `pagos`
SET `estatus` = 'vencido'
WHERE `estatus` = 'atrasado';

-- 2) Alinear definicion de columna estatus en pagos
ALTER TABLE `pagos`
  MODIFY COLUMN `estatus` VARCHAR(20) NOT NULL
    DEFAULT 'pendiente'
    COMMENT 'pendiente, pagado, parcial, vencido, cancelado';

-- 3) Alinear definicion de columna estatus en amortizacion
ALTER TABLE `amortizacion`
  MODIFY COLUMN `estatus` VARCHAR(20) NOT NULL
    DEFAULT 'pendiente'
    COMMENT 'pendiente, pagado, parcial, vencido, cancelado';

-- 4) Agregar restricciones CHECK para materializar el dominio de estatus (MySQL 8+)
ALTER TABLE `pagos`
  ADD CONSTRAINT `chk_pagos_estatus`
    CHECK (`estatus` IN ('pendiente', 'pagado', 'parcial', 'vencido', 'cancelado'));

ALTER TABLE `amortizacion`
  ADD CONSTRAINT `chk_amortizacion_estatus`
    CHECK (`estatus` IN ('pendiente', 'pagado', 'parcial', 'vencido', 'cancelado'));

-- 5) Convertir idx_pagos_venta_numero en indice unico para garantizar relacion 1:1
--    entre pagos y amortizacion por (venta_id, numero_pago)
ALTER TABLE `pagos`
  DROP INDEX `idx_pagos_venta_numero`;

ALTER TABLE `pagos`
  ADD UNIQUE INDEX `idx_pagos_venta_numero` (`venta_id`, `numero_pago`);


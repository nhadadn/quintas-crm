-- Migration: 018_create_comisiones_table.sql
-- Description: Create comisiones table for commission management
-- Date: 2026-02-13

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `comisiones`;

CREATE TABLE `comisiones` (
  `id` CHAR(36) NOT NULL,
  `venta_id` CHAR(36) NOT NULL,
  `vendedor_id` CHAR(36) NOT NULL,
  `tipo_comision` VARCHAR(50) DEFAULT 'General' COMMENT 'Enganche, Contrato, Liquidación, etc.',
  `monto_venta` DECIMAL(12,2) NOT NULL,
  `porcentaje_comision` DECIMAL(5,2) NOT NULL,
  `monto_comision` DECIMAL(12,2) NOT NULL,
  `estatus` VARCHAR(20) DEFAULT 'pendiente' COMMENT 'pendiente, aprobada, pagada, cancelada',
  `fecha_pago_programada` DATE NULL,
  `fecha_aprobacion` DATETIME NULL,
  `fecha_pago` DATETIME NULL,
  `aprobado_por` CHAR(36) NULL COMMENT 'Directus User ID',
  `notas` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_venta_id` (`venta_id` ASC),
  INDEX `idx_vendedor_id` (`vendedor_id` ASC),
  INDEX `idx_estatus` (`estatus` ASC),
  CONSTRAINT `fk_comisiones_ventas`
    FOREIGN KEY (`venta_id`)
    REFERENCES `ventas` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_comisiones_vendedores`
    FOREIGN KEY (`vendedor_id`)
    REFERENCES `vendedores` (`id`)
    ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

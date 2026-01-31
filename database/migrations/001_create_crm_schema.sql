-- Migration: 001_create_crm_schema.sql
-- Description: Creación de tablas para el módulo CRM y Ventas
-- Author: Database Agent Warrior
-- Date: 2026-01-30

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------
-- Clean up existing tables
-- -----------------------------------------------------
DROP TABLE IF EXISTS `comisiones`;
DROP TABLE IF EXISTS `pagos`;
DROP TABLE IF EXISTS `ventas`;
DROP TABLE IF EXISTS `vendedores`;
DROP TABLE IF EXISTS `clientes`;

-- -----------------------------------------------------
-- Adapt existing 'lotes' table to new Schema (UUID)
-- -----------------------------------------------------
-- Nota: FKs dropped via JS script before execution to ensure safety
-- Modificar columnas a UUID (safe to re-run)
ALTER TABLE `lotes` MODIFY `cliente_id` CHAR(36) NULL COMMENT 'FK a Clientes (UUID)';
ALTER TABLE `lotes` MODIFY `vendedor_id` CHAR(36) NULL COMMENT 'FK a Vendedores (UUID)';

-- -----------------------------------------------------
-- Table `clientes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clientes` (
  `id` CHAR(36) NOT NULL COMMENT 'UUID generado por Directus',
  `estatus` VARCHAR(20) NOT NULL DEFAULT 'prospecto' COMMENT 'prospecto, activo, inactivo',
  `nombre` VARCHAR(100) NOT NULL,
  `apellido_paterno` VARCHAR(100) NOT NULL,
  `apellido_materno` VARCHAR(100) NULL,
  `email` VARCHAR(255) NOT NULL,
  `telefono` VARCHAR(20) NULL,
  `rfc` VARCHAR(13) NULL,
  `direccion` TEXT NULL,
  `ciudad` VARCHAR(100) NULL,
  `estado` VARCHAR(100) NULL,
  `cp` VARCHAR(10) NULL,
  `notas` TEXT NULL,
  `fecha_registro` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `ultima_actualizacion` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC),
  UNIQUE INDEX `rfc_UNIQUE` (`rfc` ASC),
  INDEX `idx_estatus` (`estatus` ASC),
  INDEX `idx_fecha_registro` (`fecha_registro` ASC)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `vendedores`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `vendedores` (
  `id` CHAR(36) NOT NULL COMMENT 'UUID generado por Directus',
  `estatus` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=Activo, 0=Inactivo',
  `nombre` VARCHAR(100) NOT NULL,
  `apellido_paterno` VARCHAR(100) NOT NULL,
  `apellido_materno` VARCHAR(100) NULL,
  `email` VARCHAR(255) NOT NULL,
  `telefono` VARCHAR(20) NULL,
  `comision_porcentaje` DECIMAL(5,2) DEFAULT 5.00,
  `comision_esquema` VARCHAR(20) DEFAULT 'porcentaje' COMMENT 'fijo, porcentaje, mixto',
  `fecha_alta` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `ultima_venta` DATETIME NULL,
  `notas` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC),
  INDEX `idx_estatus` (`estatus` ASC),
  INDEX `idx_comision_esquema` (`comision_esquema` ASC)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `ventas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `ventas` (
  `id` CHAR(36) NOT NULL COMMENT 'UUID generado por Directus',
  `lote_id` INT NOT NULL COMMENT 'FK a tabla lotes (Legacy INT)',
  `cliente_id` CHAR(36) NOT NULL,
  `vendedor_id` CHAR(36) NOT NULL,
  `fecha_venta` DATE NOT NULL,
  `fecha_apartado` DATE NULL,
  `fecha_contrato` DATE NULL,
  `monto_total` DECIMAL(12,2) NOT NULL,
  `enganche` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `monto_financiado` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `plazo_meses` INT NOT NULL DEFAULT 0,
  `tasa_interes` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `estatus` VARCHAR(20) NOT NULL DEFAULT 'apartado' COMMENT 'apartado, contrato, pagos, liquidado, cancelado',
  `metodo_pago` VARCHAR(20) DEFAULT 'financiado' COMMENT 'contado, financiado',
  `notas` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_lote_id` (`lote_id` ASC),
  INDEX `idx_cliente_id` (`cliente_id` ASC),
  INDEX `idx_vendedor_id` (`vendedor_id` ASC),
  INDEX `idx_estatus` (`estatus` ASC),
  INDEX `idx_fecha_venta` (`fecha_venta` ASC),
  CONSTRAINT `fk_ventas_lotes`
    FOREIGN KEY (`lote_id`)
    REFERENCES `lotes` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ventas_clientes`
    FOREIGN KEY (`cliente_id`)
    REFERENCES `clientes` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ventas_vendedores`
    FOREIGN KEY (`vendedor_id`)
    REFERENCES `vendedores` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `pagos`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `pagos` (
  `id` CHAR(36) NOT NULL COMMENT 'UUID generado por Directus',
  `venta_id` CHAR(36) NOT NULL,
  `numero_pago` INT NOT NULL,
  `fecha_pago` DATE NULL,
  `fecha_vencimiento` DATE NOT NULL,
  `monto` DECIMAL(12,2) NOT NULL,
  `monto_pagado` DECIMAL(12,2) DEFAULT 0.00,
  `mora` DECIMAL(12,2) DEFAULT 0.00,
  `concepto` VARCHAR(255) NULL,
  `estatus` VARCHAR(20) NOT NULL DEFAULT 'pendiente' COMMENT 'pendiente, pagado, atrasado, cancelado',
  `metodo_pago` VARCHAR(50) NULL COMMENT 'efectivo, transferencia, tarjeta, cheque',
  `referencia` VARCHAR(100) NULL,
  `notas` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_venta_id` (`venta_id` ASC),
  INDEX `idx_estatus` (`estatus` ASC),
  INDEX `idx_fecha_vencimiento` (`fecha_vencimiento` ASC),
  CONSTRAINT `fk_pagos_ventas`
    FOREIGN KEY (`venta_id`)
    REFERENCES `ventas` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `comisiones`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `comisiones` (
  `id` CHAR(36) NOT NULL COMMENT 'UUID generado por Directus',
  `venta_id` CHAR(36) NOT NULL,
  `vendedor_id` CHAR(36) NOT NULL,
  `monto_comision` DECIMAL(12,2) NOT NULL,
  `porcentaje` DECIMAL(5,2) NOT NULL,
  `tipo_comision` VARCHAR(20) NOT NULL COMMENT 'enganche, contrato, mensualidad, liquidacion',
  `estatus` VARCHAR(20) NOT NULL DEFAULT 'pendiente' COMMENT 'pendiente, pagada, cancelada',
  `fecha_pago_programada` DATE NULL,
  `fecha_pago_actual` DATE NULL,
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
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_comisiones_vendedores`
    FOREIGN KEY (`vendedor_id`)
    REFERENCES `vendedores` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Restore relationships
-- -----------------------------------------------------
ALTER TABLE `lotes` ADD CONSTRAINT `fk_lotes_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `lotes` ADD CONSTRAINT `fk_lotes_vendedor` FOREIGN KEY (`vendedor_id`) REFERENCES `vendedores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;

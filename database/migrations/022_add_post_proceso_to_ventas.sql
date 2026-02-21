-- Migration: 022_add_post_proceso_to_ventas.sql
-- Description: Agrega columnas de post-proceso a la tabla `ventas`
-- Author: CRM Hook Restoration
-- Date: 2026-02-16
-- Notas: Diseñada para ejecutarse de forma segura múltiples veces (IF NOT EXISTS)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Añadir columnas para seguimiento de post-procesamiento
ALTER TABLE `ventas`
  ADD COLUMN IF NOT EXISTS `post_proceso` VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, OK, FAILED' AFTER `estatus`,
  ADD COLUMN IF NOT EXISTS `post_proceso_error` TEXT NULL AFTER `post_proceso`;

SET FOREIGN_KEY_CHECKS = 1;


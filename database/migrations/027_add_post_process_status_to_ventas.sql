-- Migration: 027_add_post_process_status_to_ventas.sql
-- Description: Agrega columnas de estado de post-proceso a ventas para visibilidad y recuperación
-- Date: 2026-02-15
+
SET NAMES utf8mb4;
+
ALTER TABLE `ventas`
  ADD COLUMN `post_process_status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending, ok, error' AFTER `metodo_pago`,
  ADD COLUMN `post_process_error` TEXT NULL AFTER `post_process_status`;
+
-- Índice opcional para reportes/filtrado rápido
CREATE INDEX `idx_post_process_status` ON `ventas` (`post_process_status`);


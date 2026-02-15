-- Migration: 019_add_zona_to_lotes.sql
-- Description: Agregar campo 'zona' a la tabla lotes para reportes
-- Date: 2026-02-13

ALTER TABLE `lotes`
ADD COLUMN `zona` VARCHAR(50) NULL COMMENT 'Zona, Manzana o Sector del lote' AFTER `estatus`;

-- Index for reporting performance
CREATE INDEX `idx_lotes_zona` ON `lotes` (`zona`);

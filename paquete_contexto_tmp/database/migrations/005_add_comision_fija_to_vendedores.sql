-- Migration: 005_add_comision_fija_to_vendedores.sql
-- Description: Agregar columna comision_fija para esquemas mixtos y fijos
-- Date: 2026-02-01

SET NAMES utf8mb4;

ALTER TABLE `vendedores` 
ADD COLUMN `comision_fija` DECIMAL(12,2) DEFAULT 0.00 AFTER `comision_porcentaje`;

-- Migration: 004_add_user_id_to_clientes.sql
-- Description: Agregar campo user_id a clientes para vincular con directus_users
-- Author: Backend Agent
-- Date: 2026-01-31

SET NAMES utf8mb4;

-- Agregar columna user_id a clientes
-- Es un UUID que referencia a directus_users.id
-- Puede ser NULL inicialmente para clientes que no tienen acceso al portal

ALTER TABLE `clientes`
ADD COLUMN `user_id` CHAR(36) NULL COMMENT 'FK a directus_users (UUID) para acceso al portal' AFTER `id`;

-- Agregar índice para búsquedas rápidas por user_id (usado en permisos RLS)
ALTER TABLE `clientes`
ADD INDEX `idx_user_id` (`user_id` ASC);

-- Opcional: Agregar FK constraint si se desea integridad estricta
-- Nota: En Directus a veces se prefiere gestionar relaciones lógicas, pero la FK es buena práctica.
-- Asumiendo que la tabla directus_users existe y usa UUIDs (estándar en Directus recientes).
-- Si directus_users no está en el mismo schema SQL (raro pero posible), esto fallaría.
-- Comentado por seguridad, descomentar si se tiene certeza del schema de directus_users.
-- ALTER TABLE `clientes` ADD CONSTRAINT `fk_clientes_user_id` FOREIGN KEY (`user_id`) REFERENCES `directus_users` (`id`) ON DELETE SET NULL;

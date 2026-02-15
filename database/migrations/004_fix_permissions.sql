
-- Migration: 004_fix_permissions.sql
-- Description: Add user_id to vendedores, grant permissions for Cliente and Vendedor roles
-- Date: 2026-02-13

SET NAMES utf8mb4;

-- ------------------------------------------------------------------------------------------------
-- 1. Schema Updates: Add user_id to vendedores (similar to clientes)
-- ------------------------------------------------------------------------------------------------
SET @exist_col := (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'vendedores' AND column_name = 'user_id' AND table_schema = DATABASE());
SET @sql := IF(@exist_col = 0, 'ALTER TABLE vendedores ADD COLUMN user_id CHAR(36) NULL COMMENT "FK a directus_users"', 'SELECT "Columna user_id ya existe en vendedores"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index for user_id
SET @exist_idx := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_name = 'vendedores' AND index_name = 'idx_vendedores_user_id' AND table_schema = DATABASE());
SET @sql := IF(@exist_idx = 0, 'CREATE INDEX idx_vendedores_user_id ON vendedores(user_id)', 'SELECT "Index idx_vendedores_user_id ya existe"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------------------------------------------
-- 2. Update 'Cliente Policy' (8704c7c8-8924-4246-9214-727500c283c7)
-- ------------------------------------------------------------------------------------------------

-- Allow Clients to read active Vendedores (so they can see who sold to them or contact list)
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT '8704c7c8-8924-4246-9214-727500c283c7', 'vendedores', 'read', '{"estatus": {"_eq": "1"}}', NULL, '*'
WHERE NOT EXISTS (SELECT 1 FROM `directus_permissions` WHERE `policy` = '8704c7c8-8924-4246-9214-727500c283c7' AND `collection` = 'vendedores' AND `action` = 'read');


-- ------------------------------------------------------------------------------------------------
-- 3. Create 'Vendedor Policy' and Role
-- ------------------------------------------------------------------------------------------------

-- Create Policy
INSERT INTO `directus_policies` (`id`, `name`, `icon`, `description`, `app_access`, `admin_access`, `enforce_tfa`)
SELECT '140c8369-074c-4712-984e-72089301294d', 'Vendedor Policy', 'badge', 'Politica de acceso para vendedores', 1, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM `directus_policies` WHERE `id` = '140c8369-074c-4712-984e-72089301294d');

-- Create Role 'Vendedor' (if not exists by name, or use fixed ID)
-- Using fixed ID: 20f78278-6872-4c28-984e-09673892095f
INSERT INTO `directus_roles` (`id`, `name`, `icon`, `description`)
SELECT '20f78278-6872-4c28-984e-09673892095f', 'Vendedor', 'badge', 'Rol para equipo de ventas'
WHERE NOT EXISTS (SELECT 1 FROM `directus_roles` WHERE `name` = 'Vendedor');

-- Bind Role to Policy
INSERT INTO `directus_access` (`id`, `role`, `policy`, `sort`)
SELECT UUID(), '20f78278-6872-4c28-984e-09673892095f', '140c8369-074c-4712-984e-72089301294d', 1
WHERE NOT EXISTS (SELECT 1 FROM `directus_access` WHERE `role` = '20f78278-6872-4c28-984e-09673892095f' AND `policy` = '140c8369-074c-4712-984e-72089301294d');


-- ------------------------------------------------------------------------------------------------
-- 4. Permissions for 'Vendedor Policy'
-- ------------------------------------------------------------------------------------------------

-- Vendedores: Read own profile (via user_id OR email)
-- Using OR logic to support both linking methods for now
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT '140c8369-074c-4712-984e-72089301294d', 'vendedores', 'read', '{"_or": [{"user_id": {"_eq": "$CURRENT_USER"}}, {"email": {"_eq": "$CURRENT_USER.email"}}]}', NULL, '*'
WHERE NOT EXISTS (SELECT 1 FROM `directus_permissions` WHERE `policy` = '140c8369-074c-4712-984e-72089301294d' AND `collection` = 'vendedores' AND `action` = 'read');

INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT '140c8369-074c-4712-984e-72089301294d', 'vendedores', 'update', '{"_or": [{"user_id": {"_eq": "$CURRENT_USER"}}, {"email": {"_eq": "$CURRENT_USER.email"}}]}', NULL, 'telefono,notas,password'
WHERE NOT EXISTS (SELECT 1 FROM `directus_permissions` WHERE `policy` = '140c8369-074c-4712-984e-72089301294d' AND `collection` = 'vendedores' AND `action` = 'update');

-- Ventas: Read where they are the salesperson
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT '140c8369-074c-4712-984e-72089301294d', 'ventas', 'read', '{"vendedor_id": {"_or": [{"user_id": {"_eq": "$CURRENT_USER"}}, {"email": {"_eq": "$CURRENT_USER.email"}}]}}', NULL, '*'
WHERE NOT EXISTS (SELECT 1 FROM `directus_permissions` WHERE `policy` = '140c8369-074c-4712-984e-72089301294d' AND `collection` = 'ventas' AND `action` = 'read');

-- Clientes: Read clients assigned to their sales
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT '140c8369-074c-4712-984e-72089301294d', 'clientes', 'read', '{"ventas": {"vendedor_id": {"_or": [{"user_id": {"_eq": "$CURRENT_USER"}}, {"email": {"_eq": "$CURRENT_USER.email"}}]}}}', NULL, '*'
WHERE NOT EXISTS (SELECT 1 FROM `directus_permissions` WHERE `policy` = '140c8369-074c-4712-984e-72089301294d' AND `collection` = 'clientes' AND `action` = 'read');

-- Pagos: Read payments for their sales
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT '140c8369-074c-4712-984e-72089301294d', 'pagos', 'read', '{"venta_id": {"vendedor_id": {"_or": [{"user_id": {"_eq": "$CURRENT_USER"}}, {"email": {"_eq": "$CURRENT_USER.email"}}]}}}', NULL, '*'
WHERE NOT EXISTS (SELECT 1 FROM `directus_permissions` WHERE `policy` = '140c8369-074c-4712-984e-72089301294d' AND `collection` = 'pagos' AND `action` = 'read');

-- Comisiones: Read own commissions
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT '140c8369-074c-4712-984e-72089301294d', 'comisiones', 'read', '{"vendedor_id": {"_or": [{"user_id": {"_eq": "$CURRENT_USER"}}, {"email": {"_eq": "$CURRENT_USER.email"}}]}}', NULL, '*'
WHERE NOT EXISTS (SELECT 1 FROM `directus_permissions` WHERE `policy` = '140c8369-074c-4712-984e-72089301294d' AND `collection` = 'comisiones' AND `action` = 'read');

-- Lotes: Read all active lotes (to sell them)
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT '140c8369-074c-4712-984e-72089301294d', 'lotes', 'read', '{"estatus": {"_neq": "vendido"}}', NULL, '*'
WHERE NOT EXISTS (SELECT 1 FROM `directus_permissions` WHERE `policy` = '140c8369-074c-4712-984e-72089301294d' AND `collection` = 'lotes' AND `action` = 'read');

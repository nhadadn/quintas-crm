
-- Migration: 003_create_roles_permissions.sql
-- Description: Creación del Rol 'Cliente', vinculación con Users y permisos RLS completos (T5.2.1 - T5.2.7)
-- Updated for Directus 10.10+ Policies Schema
-- Author: Backend Agent
-- Date: 2026-01-31

SET NAMES utf8mb4;

-- ------------------------------------------------------------------------------------------------
-- 0. Schema Updates (Prerrequisitos T5.2.6 y T5.2.7)
-- ------------------------------------------------------------------------------------------------

-- T5.2.7: Agregar user_id a clientes para vinculación robusta
SET @exist_col := (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'user_id' AND table_schema = DATABASE());
SET @sql := IF(@exist_col = 0, 'ALTER TABLE clientes ADD COLUMN user_id CHAR(36) NULL COMMENT "FK a directus_users"', 'SELECT "Columna user_id ya existe"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index para user_id
SET @exist_idx := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_name = 'clientes' AND index_name = 'idx_clientes_user_id' AND table_schema = DATABASE());
SET @sql := IF(@exist_idx = 0, 'CREATE INDEX idx_clientes_user_id ON clientes(user_id)', 'SELECT "Index idx_clientes_user_id ya existe"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- T5.2.6 Support: Agregar cliente_id a directus_files para RLS de documentos
SET @exist_col_files := (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'directus_files' AND column_name = 'cliente_id' AND table_schema = DATABASE());
SET @sql := IF(@exist_col_files = 0, 'ALTER TABLE directus_files ADD COLUMN cliente_id CHAR(36) NULL COMMENT "FK a clientes"', 'SELECT "Columna cliente_id ya existe en directus_files"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ------------------------------------------------------------------------------------------------
-- 1. Crear Policy 'Cliente Policy'
-- ------------------------------------------------------------------------------------------------
-- ID: 8704c7c8-8924-4246-9214-727500c283c7

INSERT INTO `directus_policies` (`id`, `name`, `icon`, `description`, `app_access`, `admin_access`, `enforce_tfa`)
SELECT '8704c7c8-8924-4246-9214-727500c283c7', 'Cliente Policy', 'person', 'Politica de acceso para clientes del portal', 1, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM `directus_policies` WHERE `id` = '8704c7c8-8924-4246-9214-727500c283c7');


-- ------------------------------------------------------------------------------------------------
-- 2. Crear Rol 'Cliente'
-- ------------------------------------------------------------------------------------------------
-- ID: 958022d8-5421-4202-8610-85af40751339

INSERT INTO `directus_roles` (`id`, `name`, `icon`, `description`)
SELECT '958022d8-5421-4202-8610-85af40751339', 'Cliente', 'person', 'Rol para clientes externos del portal'
WHERE NOT EXISTS (SELECT 1 FROM `directus_roles` WHERE `id` = '958022d8-5421-4202-8610-85af40751339');


-- ------------------------------------------------------------------------------------------------
-- 3. Vincular Rol y Policy (directus_access)
-- ------------------------------------------------------------------------------------------------
INSERT INTO `directus_access` (`id`, `role`, `policy`, `sort`)
SELECT UUID(), '958022d8-5421-4202-8610-85af40751339', '8704c7c8-8924-4246-9214-727500c283c7', 1
WHERE NOT EXISTS (SELECT 1 FROM `directus_access` WHERE `role` = '958022d8-5421-4202-8610-85af40751339' AND `policy` = '8704c7c8-8924-4246-9214-727500c283c7');


-- ------------------------------------------------------------------------------------------------
-- 4. Permisos (Vinculados a la POLICY)
-- ------------------------------------------------------------------------------------------------

-- Permisos Colección 'clientes' (T5.2.2)
-- READ: Solo su propio registro
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT '8704c7c8-8924-4246-9214-727500c283c7', 'clientes', 'read', '{"user_id": {"_eq": "$CURRENT_USER"}}', NULL, '*'
WHERE NOT EXISTS (SELECT 1 FROM `directus_permissions` WHERE `policy` = '8704c7c8-8924-4246-9214-727500c283c7' AND `collection` = 'clientes' AND `action` = 'read');

-- UPDATE: Solo su propio registro y campos específicos
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT '8704c7c8-8924-4246-9214-727500c283c7', 'clientes', 'update', '{"user_id": {"_eq": "$CURRENT_USER"}}', NULL, 'telefono,email'
WHERE NOT EXISTS (SELECT 1 FROM `directus_permissions` WHERE `policy` = '8704c7c8-8924-4246-9214-727500c283c7' AND `collection` = 'clientes' AND `action` = 'update');

-- Permisos Colección 'ventas' (T5.2.3)
-- READ: Solo sus ventas
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT '8704c7c8-8924-4246-9214-727500c283c7', 'ventas', 'read', '{"cliente_id": {"user_id": {"_eq": "$CURRENT_USER"}}}', NULL, '*'
WHERE NOT EXISTS (SELECT 1 FROM `directus_permissions` WHERE `policy` = '8704c7c8-8924-4246-9214-727500c283c7' AND `collection` = 'ventas' AND `action` = 'read');

-- Permisos Colección 'pagos' (T5.2.4)
-- READ: Solo registros de sus ventas
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT '8704c7c8-8924-4246-9214-727500c283c7', 'pagos', 'read', '{"venta_id": {"cliente_id": {"user_id": {"_eq": "$CURRENT_USER"}}}}', NULL, '*'
WHERE NOT EXISTS (SELECT 1 FROM `directus_permissions` WHERE `policy` = '8704c7c8-8924-4246-9214-727500c283c7' AND `collection` = 'pagos' AND `action` = 'read');

-- Permisos Colección 'lotes' (T5.2.5)
-- READ: Solo el lote que compró
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT '8704c7c8-8924-4246-9214-727500c283c7', 'lotes', 'read', '{"cliente_id": {"user_id": {"_eq": "$CURRENT_USER"}}}', NULL, '*'
WHERE NOT EXISTS (SELECT 1 FROM `directus_permissions` WHERE `policy` = '8704c7c8-8924-4246-9214-727500c283c7' AND `collection` = 'lotes' AND `action` = 'read');

-- Permisos Colección 'directus_files' (T5.2.6)
-- READ: Archivos subidos por el usuario O asignados a su Cliente
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT '8704c7c8-8924-4246-9214-727500c283c7', 'directus_files', 'read', '{"_or": [{"uploaded_by": {"_eq": "$CURRENT_USER"}}, {"cliente_id": {"user_id": {"_eq": "$CURRENT_USER"}}}]}', NULL, '*'
WHERE NOT EXISTS (SELECT 1 FROM `directus_permissions` WHERE `policy` = '8704c7c8-8924-4246-9214-727500c283c7' AND `collection` = 'directus_files' AND `action` = 'read');

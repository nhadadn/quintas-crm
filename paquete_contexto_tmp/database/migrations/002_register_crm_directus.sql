-- Migration: 002_register_crm_directus.sql
-- Description: Register CRM tables in Directus System Tables
-- Date: 2026-01-30

SET NAMES utf8mb4;

-- -----------------------------------------------------
-- 1. Register Collections
-- -----------------------------------------------------
INSERT IGNORE INTO directus_collections (collection, icon, hidden, archive_field, archive_value, unarchive_value) VALUES ('clientes', 'group', 0, 'estatus', 'archived', 'draft');
INSERT IGNORE INTO directus_collections (collection, icon, hidden, archive_field, archive_value, unarchive_value) VALUES ('vendedores', 'badge', 0, 'estatus', 'archived', 'draft');
INSERT IGNORE INTO directus_collections (collection, icon, hidden, archive_field, archive_value, unarchive_value) VALUES ('ventas', 'monetization_on', 0, 'estatus', 'archived', 'draft');
INSERT IGNORE INTO directus_collections (collection, icon, hidden, archive_field, archive_value, unarchive_value) VALUES ('pagos', 'receipt', 0, 'estatus', 'archived', 'draft');
INSERT IGNORE INTO directus_collections (collection, icon, hidden, archive_field, archive_value, unarchive_value) VALUES ('comisiones', 'payments', 0, 'estatus', 'archived', 'draft');
INSERT IGNORE INTO directus_collections (collection, icon, hidden, archive_field, archive_value, unarchive_value) VALUES ('lotes', 'map', 0, 'estatus', 'archived', 'draft');

-- -----------------------------------------------------
-- 2. Register Relations & FK Fields
-- -----------------------------------------------------
INSERT IGNORE INTO directus_fields (collection, field, special, interface, readonly, hidden, width) VALUES ('ventas', 'cliente_id', 'm2o', 'select-dropdown-m2o', 0, 0, 'half');
DELETE FROM directus_relations WHERE many_collection = 'ventas' AND many_field = 'cliente_id';
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field) VALUES ('ventas', 'cliente_id', 'clientes', NULL);
INSERT IGNORE INTO directus_fields (collection, field, special, interface, readonly, hidden, width) VALUES ('ventas', 'lote_id', 'm2o', 'select-dropdown-m2o', 0, 0, 'half');
DELETE FROM directus_relations WHERE many_collection = 'ventas' AND many_field = 'lote_id';
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field) VALUES ('ventas', 'lote_id', 'lotes', NULL);
INSERT IGNORE INTO directus_fields (collection, field, special, interface, readonly, hidden, width) VALUES ('ventas', 'vendedor_id', 'm2o', 'select-dropdown-m2o', 0, 0, 'half');
DELETE FROM directus_relations WHERE many_collection = 'ventas' AND many_field = 'vendedor_id';
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field) VALUES ('ventas', 'vendedor_id', 'vendedores', NULL);
INSERT IGNORE INTO directus_fields (collection, field, special, interface, readonly, hidden, width) VALUES ('pagos', 'venta_id', 'm2o', 'select-dropdown-m2o', 0, 0, 'half');
DELETE FROM directus_relations WHERE many_collection = 'pagos' AND many_field = 'venta_id';
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field) VALUES ('pagos', 'venta_id', 'ventas', NULL);
INSERT IGNORE INTO directus_fields (collection, field, special, interface, readonly, hidden, width) VALUES ('comisiones', 'vendedor_id', 'm2o', 'select-dropdown-m2o', 0, 0, 'half');
DELETE FROM directus_relations WHERE many_collection = 'comisiones' AND many_field = 'vendedor_id';
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field) VALUES ('comisiones', 'vendedor_id', 'vendedores', NULL);
INSERT IGNORE INTO directus_fields (collection, field, special, interface, readonly, hidden, width) VALUES ('comisiones', 'venta_id', 'm2o', 'select-dropdown-m2o', 0, 0, 'half');
DELETE FROM directus_relations WHERE many_collection = 'comisiones' AND many_field = 'venta_id';
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field) VALUES ('comisiones', 'venta_id', 'ventas', NULL);
INSERT IGNORE INTO directus_fields (collection, field, special, interface, readonly, hidden, width) VALUES ('lotes', 'cliente_id', 'm2o', 'select-dropdown-m2o', 0, 0, 'half');
DELETE FROM directus_relations WHERE many_collection = 'lotes' AND many_field = 'cliente_id';
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field) VALUES ('lotes', 'cliente_id', 'clientes', NULL);
INSERT IGNORE INTO directus_fields (collection, field, special, interface, readonly, hidden, width) VALUES ('lotes', 'vendedor_id', 'm2o', 'select-dropdown-m2o', 0, 0, 'half');
DELETE FROM directus_relations WHERE many_collection = 'lotes' AND many_field = 'vendedor_id';
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field) VALUES ('lotes', 'vendedor_id', 'vendedores', NULL);

-- -----------------------------------------------------
-- 3. Register Roles
-- -----------------------------------------------------
INSERT IGNORE INTO directus_roles (id, name, icon, description) VALUES ('958022d8-5421-4202-8610-85af40751339', 'Cliente', 'person', 'Acceso al portal de clientes');

-- -----------------------------------------------------
-- 4. Register Permissions
-- -----------------------------------------------------
DELETE FROM directus_permissions WHERE role IN ('0448b826-6817-4106-8488-7237dfa55abf', '958022d8-5421-4202-8610-85af40751339') AND collection IN ('clientes', 'ventas', 'pagos', 'comisiones', 'lotes', 'vendedores');
INSERT INTO directus_permissions (role, collection, action, permissions, validation) VALUES ('0448b826-6817-4106-8488-7237dfa55abf', 'clientes', 'create', '{"estatus":{"_eq":"prospecto"}}', NULL);
INSERT INTO directus_permissions (role, collection, action, permissions) VALUES ('0448b826-6817-4106-8488-7237dfa55abf', 'clientes', 'read', '{}');
INSERT INTO directus_permissions (role, collection, action, permissions) VALUES ('0448b826-6817-4106-8488-7237dfa55abf', 'clientes', 'update', '{}');
INSERT INTO directus_permissions (role, collection, action, permissions) VALUES ('0448b826-6817-4106-8488-7237dfa55abf', 'ventas', 'read', '{"vendedor_id":{"_eq":"$CURRENT_USER"}}');
INSERT INTO directus_permissions (role, collection, action, permissions) VALUES ('0448b826-6817-4106-8488-7237dfa55abf', 'ventas', 'create', '{"vendedor_id":{"_eq":"$CURRENT_USER"}}');
INSERT INTO directus_permissions (role, collection, action, permissions) VALUES ('0448b826-6817-4106-8488-7237dfa55abf', 'lotes', 'read', '{}');
INSERT INTO directus_permissions (role, collection, action, permissions) VALUES ('958022d8-5421-4202-8610-85af40751339', 'ventas', 'read', '{"cliente_id":{"email":{"_eq":"$CURRENT_USER.email"}}}');

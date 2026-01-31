-- Migration: 002_register_crm_directus_v2.sql
-- Description: Register CRM tables in Directus (Collections, Policies, Access)
-- Date: 2026-01-30

SET NAMES utf8mb4;

-- 1. Collections
INSERT IGNORE INTO directus_collections (collection, icon, hidden, archive_field, archive_value, unarchive_value) VALUES ('clientes', 'group', 0, 'estatus', 'archived', 'draft');
INSERT IGNORE INTO directus_collections (collection, icon, hidden, archive_field, archive_value, unarchive_value) VALUES ('vendedores', 'badge', 0, 'estatus', 'archived', 'draft');
INSERT IGNORE INTO directus_collections (collection, icon, hidden, archive_field, archive_value, unarchive_value) VALUES ('ventas', 'monetization_on', 0, 'estatus', 'archived', 'draft');
INSERT IGNORE INTO directus_collections (collection, icon, hidden, archive_field, archive_value, unarchive_value) VALUES ('pagos', 'receipt', 0, 'estatus', 'archived', 'draft');
INSERT IGNORE INTO directus_collections (collection, icon, hidden, archive_field, archive_value, unarchive_value) VALUES ('comisiones', 'payments', 0, 'estatus', 'archived', 'draft');
INSERT IGNORE INTO directus_collections (collection, icon, hidden, archive_field, archive_value, unarchive_value) VALUES ('lotes', 'map', 0, 'estatus', 'archived', 'draft');

-- 2. Relations
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

-- 3. Roles & Policies
INSERT IGNORE INTO directus_roles (id, name, icon, description) VALUES ('958022d8-5421-4202-8610-85af40751339', 'Cliente', 'person', 'Acceso al portal de clientes');
INSERT IGNORE INTO directus_policies (id, name, icon, description, app_access) VALUES ('3a45c613-3333-4444-5555-666677778888', 'Cliente Portal', 'public', 'Acceso limitado para clientes', 1);
DELETE FROM directus_access WHERE role = '958022d8-5421-4202-8610-85af40751339' AND policy = '3a45c613-3333-4444-5555-666677778888';
INSERT INTO directus_access (id, role, policy, sort) VALUES ('2b134b08-b622-416b-a802-4a368deb87f1', '958022d8-5421-4202-8610-85af40751339', '3a45c613-3333-4444-5555-666677778888', 1);

-- 4. Permissions (via Policy)
DELETE FROM directus_permissions WHERE policy IN ('b36d83a6-e7f2-46f6-a60d-3189149217dc', '3a45c613-3333-4444-5555-666677778888') AND collection IN ('clientes', 'ventas', 'pagos', 'comisiones', 'lotes', 'vendedores');
INSERT INTO directus_permissions (policy, collection, action, permissions, validation) VALUES ('b36d83a6-e7f2-46f6-a60d-3189149217dc', 'clientes', 'create', '{"estatus":{"_eq":"prospecto"}}', NULL);
INSERT INTO directus_permissions (policy, collection, action, permissions) VALUES ('b36d83a6-e7f2-46f6-a60d-3189149217dc', 'clientes', 'read', '{}');
INSERT INTO directus_permissions (policy, collection, action, permissions) VALUES ('b36d83a6-e7f2-46f6-a60d-3189149217dc', 'clientes', 'update', '{}');
INSERT INTO directus_permissions (policy, collection, action, permissions) VALUES ('b36d83a6-e7f2-46f6-a60d-3189149217dc', 'ventas', 'read', '{"vendedor_id":{"_eq":"$CURRENT_USER"}}');
INSERT INTO directus_permissions (policy, collection, action, permissions) VALUES ('b36d83a6-e7f2-46f6-a60d-3189149217dc', 'ventas', 'create', '{"vendedor_id":{"_eq":"$CURRENT_USER"}}');
INSERT INTO directus_permissions (policy, collection, action, permissions) VALUES ('b36d83a6-e7f2-46f6-a60d-3189149217dc', 'lotes', 'read', '{}');
INSERT INTO directus_permissions (policy, collection, action, permissions) VALUES ('3a45c613-3333-4444-5555-666677778888', 'ventas', 'read', '{"cliente_id":{"email":{"_eq":"$CURRENT_USER.email"}}}');

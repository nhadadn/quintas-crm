-- Migration: 029_fix_rbac_clientes_lotes.sql
-- Description: Ajusta permisos RBAC para rol CRM (Vendedor) en clientes, vendedores y lotes
-- Date: 2026-02-15
+
SET NAMES utf8mb4;
+
SET @POLICY_VENDEDOR := '140c8369-074c-4712-984e-72089301294d';
+
-- CLIENTES: READ global (sin filtro) y CREATE
-- READ: actualizar si existe, o insertar
UPDATE `directus_permissions`
   SET `permissions` = NULL, `fields`='*'
 WHERE `policy` = @POLICY_VENDEDOR
   AND `collection` = 'clientes'
   AND `action` = 'read';
+
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT @POLICY_VENDEDOR, 'clientes', 'read', NULL, NULL, '*'
WHERE NOT EXISTS (
  SELECT 1 FROM `directus_permissions`
   WHERE `policy` = @POLICY_VENDEDOR AND `collection` = 'clientes' AND `action` = 'read'
);
+
-- CREATE: permitir creación desde wizard
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT @POLICY_VENDEDOR, 'clientes', 'create', NULL, NULL, '*'
WHERE NOT EXISTS (
  SELECT 1 FROM `directus_permissions`
   WHERE `policy` = @POLICY_VENDEDOR AND `collection` = 'clientes' AND `action` = 'create'
);
+
-- VENDEDORES: READ global (para mapeos y listas del wizard)
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT @POLICY_VENDEDOR, 'vendedores', 'read', NULL, NULL, '*'
WHERE NOT EXISTS (
  SELECT 1 FROM `directus_permissions`
   WHERE `policy` = @POLICY_VENDEDOR AND `collection` = 'vendedores' AND `action` = 'read'
);
+
-- LOTES: READ global (remover filtro previo si existía)
UPDATE `directus_permissions`
   SET `permissions` = NULL, `fields`='*'
 WHERE `policy` = @POLICY_VENDEDOR
   AND `collection` = 'lotes'
   AND `action` = 'read';
+
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT @POLICY_VENDEDOR, 'lotes', 'read', NULL, NULL, '*'
WHERE NOT EXISTS (
  SELECT 1 FROM `directus_permissions`
   WHERE `policy` = @POLICY_VENDEDOR AND `collection` = 'lotes' AND `action` = 'read'
);


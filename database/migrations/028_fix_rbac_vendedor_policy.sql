-- Migration: 028_fix_rbac_vendedor_policy.sql
-- Description: Corrige permisos de lectura/escritura para CRM (Rol Vendedor) y agrega permisos en amortizacion/pagos_movimientos
-- Date: 2026-02-15
+
SET NAMES utf8mb4;
+
-- IDs fijos usados previamente
SET @POLICY_VENDEDOR := '140c8369-074c-4712-984e-72089301294d';
SET @ROL_VENDEDOR := '20f78278-6872-4c28-984e-09673892095f';
+
-- 1) Ventas: READ donde vendedor_id.user_id = $CURRENT_USER
UPDATE `directus_permissions`
   SET `permissions` = '{"vendedor_id": {"user_id": {"_eq": "$CURRENT_USER"}}}'
 WHERE `policy` = @POLICY_VENDEDOR
   AND `collection` = 'ventas'
   AND `action` = 'read';
+
-- Si no existía, crear
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT @POLICY_VENDEDOR, 'ventas', 'read', '{"vendedor_id": {"user_id": {"_eq": "$CURRENT_USER"}}}', NULL, '*'
WHERE NOT EXISTS (
  SELECT 1 FROM `directus_permissions`
   WHERE `policy` = @POLICY_VENDEDOR AND `collection` = 'ventas' AND `action` = 'read'
);
+
-- 2) Amortizacion: READ por ventas del vendedor
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT @POLICY_VENDEDOR, 'amortizacion', 'read', '{"venta_id": {"vendedor_id": {"user_id": {"_eq": "$CURRENT_USER"}}}}', NULL, '*'
WHERE NOT EXISTS (
  SELECT 1 FROM `directus_permissions`
   WHERE `policy` = @POLICY_VENDEDOR AND `collection` = 'amortizacion' AND `action` = 'read'
);
+
-- 3) pagos_movimientos: READ & CREATE por ventas del vendedor
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT @POLICY_VENDEDOR, 'pagos_movimientos', 'read', '{"venta_id": {"vendedor_id": {"user_id": {"_eq": "$CURRENT_USER"}}}}', NULL, '*'
WHERE NOT EXISTS (
  SELECT 1 FROM `directus_permissions`
   WHERE `policy` = @POLICY_VENDEDOR AND `collection` = 'pagos_movimientos' AND `action` = 'read'
);
+
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT @POLICY_VENDEDOR, 'pagos_movimientos', 'create', '{"venta_id": {"vendedor_id": {"user_id": {"_eq": "$CURRENT_USER"}}}}', NULL, '*'
WHERE NOT EXISTS (
  SELECT 1 FROM `directus_permissions`
   WHERE `policy` = @POLICY_VENDEDOR AND `collection` = 'pagos_movimientos' AND `action` = 'create'
);
+
-- 4) Lotes: UPDATE estatus cuando el vendedor es el asignado o al apartar su venta actual
-- (Regla básica por ahora: permitir update si estatus != 'vendido'; refinar según negocio)
INSERT INTO `directus_permissions` (`policy`, `collection`, `action`, `permissions`, `validation`, `fields`)
SELECT @POLICY_VENDEDOR, 'lotes', 'update', '{"estatus": {"_neq": "vendido"}}', NULL, 'estatus,cliente_id,vendedor_id'
WHERE NOT EXISTS (
  SELECT 1 FROM `directus_permissions`
   WHERE `policy` = @POLICY_VENDEDOR AND `collection` = 'lotes' AND `action` = 'update'
);


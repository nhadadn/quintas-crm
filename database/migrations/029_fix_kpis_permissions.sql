-- 029_fix_kpis_permissions.sql
-- Propósito: Garantizar permisos explícitos de lectura para v_dashboard_kpis y lotes (incluyendo precio_total)
-- Idempotente; compatible con instancias con policies modernas.

SET NAMES utf8mb4;

-- Resolver policy admin
SET @admin_policy := (SELECT id FROM directus_policies WHERE admin_access = 1 LIMIT 1);

-- Permiso de lectura en v_dashboard_kpis
INSERT INTO directus_permissions (policy, collection, action, fields, permissions)
SELECT @admin_policy, 'v_dashboard_kpis', 'read', '*', '{}'
FROM DUAL
WHERE @admin_policy IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_permissions
    WHERE policy = @admin_policy AND collection = 'v_dashboard_kpis' AND action = 'read'
  );

-- Permiso de lectura en lotes (todos los campos)
INSERT INTO directus_permissions (policy, collection, action, fields, permissions)
SELECT @admin_policy, 'lotes', 'read', '*', '{}'
FROM DUAL
WHERE @admin_policy IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_permissions
    WHERE policy = @admin_policy AND collection = 'lotes' AND action = 'read'
  );

-- Exponer explícitamente el campo precio_total en lotes
UPDATE directus_fields
SET hidden = 0
WHERE collection = 'lotes' AND field = 'precio_total';


-- 030_fix_kpis_pk_and_role_perms.sql
-- Propósito:
-- 1) Asegurar que la vista v_dashboard_kpis exponga una columna id estable (alias de venta_id)
-- 2) Marcar id como primary-key en directus_fields
-- 3) Insertar permisos explícitos tanto por policy (admin_access=1) como por role (Administrator) si aplica
-- Idempotente y compatible con instancias con o sin policies.

SET NAMES utf8mb4;

-- 1) Recrear vista con columna id explícita
DROP VIEW IF EXISTS v_dashboard_kpis;
CREATE VIEW v_dashboard_kpis AS
SELECT
  v.id AS id,
  v.id AS venta_id,
  v.fecha_venta,
  v.estatus,
  v.monto_total AS total_contratado,
  COALESCE(SUM(p.monto_pagado), 0) AS total_pagado
FROM ventas v
LEFT JOIN pagos p ON p.venta_id = v.id AND p.estatus = 'pagado'
GROUP BY v.id, v.fecha_venta, v.estatus, v.monto_total;

-- 2) Registrar colección visible
INSERT INTO directus_collections (collection, icon, note, hidden, singleton, accountability)
VALUES ('v_dashboard_kpis', 'dashboard', 'Vista agregada para KPIs del Dashboard', 0, 0, 'all')
ON DUPLICATE KEY UPDATE hidden = 0, accountability = 'all';

-- 3) Upsert de campos
-- id como PK
INSERT INTO directus_fields (collection, field, special, hidden)
SELECT 'v_dashboard_kpis', 'id', '["primary-key"]', 0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields WHERE collection = 'v_dashboard_kpis' AND field = 'id'
);
-- venta_id (no PK), fecha_venta, estatus, total_contratado, total_pagado
INSERT INTO directus_fields (collection, field, hidden)
SELECT 'v_dashboard_kpis', 'venta_id', 0 FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields WHERE collection = 'v_dashboard_kpis' AND field = 'venta_id'
);
INSERT INTO directus_fields (collection, field, hidden)
SELECT 'v_dashboard_kpis', 'fecha_venta', 0 FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields WHERE collection = 'v_dashboard_kpis' AND field = 'fecha_venta'
);
INSERT INTO directus_fields (collection, field, hidden)
SELECT 'v_dashboard_kpis', 'estatus', 0 FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields WHERE collection = 'v_dashboard_kpis' AND field = 'estatus'
);
INSERT INTO directus_fields (collection, field, hidden)
SELECT 'v_dashboard_kpis', 'total_contratado', 0 FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields WHERE collection = 'v_dashboard_kpis' AND field = 'total_contratado'
);
INSERT INTO directus_fields (collection, field, hidden)
SELECT 'v_dashboard_kpis', 'total_pagado', 0 FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields WHERE collection = 'v_dashboard_kpis' AND field = 'total_pagado'
);

-- 4) Permisos explícitos por policy (si existe modelo de policies)
SET @admin_policy := (SELECT id FROM directus_policies WHERE admin_access = 1 LIMIT 1);
INSERT INTO directus_permissions (policy, collection, action, fields, permissions)
SELECT @admin_policy, 'v_dashboard_kpis', 'read', '*', '{}'
FROM DUAL
WHERE @admin_policy IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_permissions
    WHERE policy = @admin_policy AND collection = 'v_dashboard_kpis' AND action = 'read'
  );

-- 5) Permisos explícitos por role (instancias legacy)
-- Detectar si directus_permissions tiene columna 'role'
SET @has_role_col := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'directus_permissions'
    AND column_name = 'role'
);
-- Obtener rol 'Administrator' si existe
SET @admin_role := (SELECT id FROM directus_roles WHERE LOWER(name) = 'administrator' LIMIT 1);
-- Insertar permiso para el rol si aplica
SET @sql_ins := IF(@has_role_col > 0 AND @admin_role IS NOT NULL,
  CONCAT('INSERT INTO directus_permissions (role, collection, action, fields, permissions)
          SELECT ''', @admin_role, ''', ''v_dashboard_kpis'', ''read'', ''*'', ''{}''
          FROM DUAL
          WHERE NOT EXISTS (
            SELECT 1 FROM directus_permissions
            WHERE role = ''', @admin_role, ''' AND collection = ''v_dashboard_kpis'' AND action = ''read''
          )'),
  'SELECT 1'
);
PREPARE stmt FROM @sql_ins;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6) Asegurar campo lotes.precio_total visible
UPDATE directus_fields
SET hidden = 0
WHERE collection = 'lotes' AND field = 'precio_total';


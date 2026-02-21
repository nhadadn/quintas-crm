-- Asegurar Policy con admin_access=1 y mapearla al rol "Administrator"
-- Compatible con Directus 10.10+ (admin_access reside en directus_policies)

-- Crear Policy "Administrator" si no existe
INSERT INTO directus_policies (id, name, icon, description, ip_access, enforce_tfa, admin_access, app_access)
SELECT UUID(), 'Administrator', 'verified', 'Full system access', NULL, 0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM directus_policies WHERE admin_access = 1);

-- Resolver IDs
SET @policy_admin_id := (SELECT id FROM directus_policies WHERE admin_access = 1 LIMIT 1);
SET @role_admin_id := (
  SELECT id FROM directus_roles WHERE LOWER(name) = LOWER('Administrator') LIMIT 1
);

-- Crear rol "Administrator" si no existe
SET @role_admin_id := IFNULL(@role_admin_id, UUID());
INSERT INTO directus_roles (id, name, icon, description, parent)
SELECT @role_admin_id, 'Administrator', 'verified', '$t:admin_description', NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_roles WHERE id = @role_admin_id);

-- Mapear acceso Role<->Policy (directus_access)
-- Si ya existe la relación, no duplicar
INSERT INTO directus_access (id, role, user, policy, sort)
SELECT UUID(), @role_admin_id, NULL, @policy_admin_id, 1
WHERE NOT EXISTS (
  SELECT 1 FROM directus_access WHERE role = @role_admin_id AND policy = @policy_admin_id
);

-- Asignar rol al usuario admin objetivo
UPDATE directus_users
SET role = @role_admin_id
WHERE id = 'e549592c-2498-4bba-93a7-b7f30903948c';

-- Crear/Recrear vista v_dashboard_kpis y registrarla en Directus
DROP VIEW IF EXISTS v_dashboard_kpis;
CREATE VIEW v_dashboard_kpis AS
SELECT
  v.id AS venta_id,
  v.fecha_venta,
  v.estatus,
  v.monto_total AS total_contratado,
  COALESCE(SUM(p.monto_pagado), 0) AS total_pagado
FROM ventas v
LEFT JOIN pagos p ON p.venta_id = v.id AND p.estatus = 'pagado'
GROUP BY v.id, v.fecha_venta, v.estatus, v.monto_total;

INSERT INTO directus_collections (collection, icon, note, hidden, singleton, accountability)
VALUES ('v_dashboard_kpis', 'dashboard', 'Vista agregada para KPIs del Dashboard', 0, 0, 'all')
ON DUPLICATE KEY UPDATE collection = collection;

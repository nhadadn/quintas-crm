INSERT INTO directus_roles (id, name, icon, description, admin_access)
SELECT UUID(), 'Administrator', 'verified', 'Full system access', 1
WHERE NOT EXISTS (SELECT 1 FROM directus_roles WHERE admin_access = 1);

SET @admin_role_id := (SELECT id FROM directus_roles WHERE admin_access = 1 LIMIT 1);

UPDATE directus_users
SET role = @admin_role_id
WHERE id = 'e549592c-2498-4bba-93a7-b7f30903948c';

DROP VIEW IF EXISTS v_dashboard_kpis;
CREATE VIEW v_dashboard_kpis AS
SELECT
  v.id AS venta_id,
  v.fecha_venta,
  v.estatus,
  v.monto_total AS total_contratado,
  COALESCE(SUM(p.monto_pagado), 0) AS total_pagado,
  v.tenant_id
FROM ventas v
LEFT JOIN pagos p ON p.venta_id = v.id AND p.estatus = 'pagado'
GROUP BY v.id, v.fecha_venta, v.estatus, v.monto_total, v.tenant_id;

INSERT INTO directus_collections (collection, icon, note, hidden, singleton, accountability)
VALUES ('v_dashboard_kpis', 'dashboard', 'Vista agregada para KPIs del Dashboard', 0, 0, 'all')
ON DUPLICATE KEY UPDATE collection = collection;

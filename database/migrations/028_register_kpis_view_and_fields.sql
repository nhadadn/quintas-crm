-- 028_register_kpis_view_and_fields.sql
-- Propósito: Asegurar registro correcto de la vista v_dashboard_kpis en Directus
--            y marcar su clave primaria, además de dejarla visible.
-- Idempotente: puede ejecutarse múltiples veces sin efectos adversos.

SET NAMES utf8mb4;

-- 1) Registrar/activar la colección v_dashboard_kpis (visible)
INSERT INTO directus_collections (collection, icon, note, hidden, singleton, accountability)
VALUES ('v_dashboard_kpis', 'dashboard', 'Vista agregada para KPIs del Dashboard', 0, 0, 'all')
ON DUPLICATE KEY UPDATE hidden = 0, accountability = 'all';

-- 2) Registrar campos en directus_fields si no existen
-- Marcar venta_id como clave primaria
INSERT INTO directus_fields (collection, field, special, hidden)
SELECT 'v_dashboard_kpis', 'venta_id', '["primary-key"]', 0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields WHERE collection = 'v_dashboard_kpis' AND field = 'venta_id'
);

-- Otros campos más comunes de la vista (sin marcar especiales)
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

-- 3) Asegurar que el campo precio_total en lotes no esté oculto
UPDATE directus_fields
SET hidden = 0
WHERE collection = 'lotes' AND field = 'precio_total';

-- 4) (Opcional) Asignar permiso de lectura directo a v_dashboard_kpis bajo la policy admin_access=1
--     Solo si existe el modelo de Policies en esta instancia.
SET @admin_policy := (SELECT id FROM directus_policies WHERE admin_access = 1 LIMIT 1);
-- Insertar permiso de lectura si no existe ya
INSERT INTO directus_permissions (policy, collection, action, fields, permissions)
SELECT @admin_policy, 'v_dashboard_kpis', 'read', '*', '{}'
FROM DUAL
WHERE @admin_policy IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_permissions
    WHERE policy = @admin_policy AND collection = 'v_dashboard_kpis' AND action = 'read'
  );


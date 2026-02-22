-- fix_pagos_movimientos_visibility.sql (MySQL)
-- Asegurar visibilidad de 'pagos_movimientos' y permiso READ para política 'Vendedores'
SET NAMES utf8mb4;

-- 1) Asegurar que la colección exista y no esté oculta
INSERT INTO directus_collections (collection, icon, hidden, singleton)
VALUES ('pagos_movimientos', 'payments', 0, 0)
ON DUPLICATE KEY UPDATE
  hidden = VALUES(hidden),
  icon = VALUES(icon),
  singleton = VALUES(singleton);

-- 2) Crear permiso READ para la política 'Vendedores' (idempotente)
SET @policy_id := (SELECT id FROM directus_policies WHERE name = 'Vendedores' LIMIT 1);

INSERT INTO directus_permissions (collection, action, permissions, validation, fields, policy)
SELECT 'pagos_movimientos', 'read', NULL, NULL, '*', @policy_id
FROM DUAL
WHERE @policy_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM directus_permissions
    WHERE collection = 'pagos_movimientos'
      AND action = 'read'
      AND policy = @policy_id
  );

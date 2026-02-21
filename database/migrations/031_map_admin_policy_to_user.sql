-- 031_map_admin_policy_to_user.sql
-- Propósito: Asegurar que el usuario administrador quede mapeado explícitamente a la policy con admin_access=1
-- Idempotente.

SET NAMES utf8mb4;

-- Identificar policy admin
SET @admin_policy := (SELECT id FROM directus_policies WHERE admin_access = 1 LIMIT 1);

-- Identificar el usuario admin objetivo (ajusta si tu user id difiere)
SET @admin_user := (SELECT id FROM directus_users WHERE email = 'nadir.hadad.navarrete@gmail.com' LIMIT 1);

-- Si ambos existen, crear el mapping por usuario (además del mapping por rol)
INSERT INTO directus_access (id, role, user, policy, sort)
SELECT UUID(), NULL, @admin_user, @admin_policy, 1
FROM DUAL
WHERE @admin_policy IS NOT NULL
  AND @admin_user IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM directus_access
    WHERE user = @admin_user AND policy = @admin_policy
  );


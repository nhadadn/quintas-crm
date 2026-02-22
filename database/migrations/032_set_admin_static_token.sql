-- 032_set_admin_static_token.sql
-- Propósito: Asignar un Static Token a usuarios con rol "Administrator"
-- Idempotente y seguro: solo actualiza si existe la columna directus_users.token

SET NAMES utf8mb4;

SET @static_token := 'quintas_admin_token_2026';
SET @admin_role := (SELECT id FROM directus_roles WHERE LOWER(name) = 'administrator' LIMIT 1);

-- Verificar si la columna 'token' existe en directus_users
SET @has_token_col := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'directus_users'
    AND column_name = 'token'
);

-- Si existe la columna 'token', actualizar usuarios con rol Administrator
SET @sql_upd := IF(@has_token_col > 0 AND @admin_role IS NOT NULL,
  CONCAT('UPDATE directus_users SET token = ''', @static_token, ''' WHERE role = ''', @admin_role, ''' AND (token IS NULL OR token = '''')'),
  'SELECT 1'
);
PREPARE stmt FROM @sql_upd;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Nota: En instancias que no usen directus_users.token, crear tokens vía API (/users/me/tokens)


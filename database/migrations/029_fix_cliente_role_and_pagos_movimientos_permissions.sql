SET NAMES utf8mb4;

INSERT IGNORE INTO directus_roles (id, name, icon, description)
VALUES ('958022d8-5421-4202-8610-85af40751339', 'Cliente', 'person', 'Acceso al portal de clientes');

DELETE FROM directus_permissions
WHERE collection = 'pagos_movimientos'
  AND permissions LIKE '%amortizacion.vendedor_id%';


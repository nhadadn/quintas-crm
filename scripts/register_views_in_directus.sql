SET NAMES utf8mb4;

INSERT INTO directus_collections (collection, icon, hidden, singleton)
VALUES ('v_dashboard_kpis', 'database', 0, 0)
ON DUPLICATE KEY UPDATE hidden = VALUES(hidden), icon = VALUES(icon), singleton = VALUES(singleton);

INSERT INTO directus_collections (collection, icon, hidden, singleton)
VALUES ('v_ventas_por_vendedor', 'database', 0, 0)
ON DUPLICATE KEY UPDATE hidden = VALUES(hidden), icon = VALUES(icon), singleton = VALUES(singleton);

INSERT INTO directus_collections (collection, icon, hidden, singleton)
VALUES ('v_estado_pagos', 'database', 0, 0)
ON DUPLICATE KEY UPDATE hidden = VALUES(hidden), icon = VALUES(icon), singleton = VALUES(singleton);

INSERT INTO directus_collections (collection, icon, hidden, singleton)
VALUES ('v_lotes_disponibles', 'database', 0, 0)
ON DUPLICATE KEY UPDATE hidden = VALUES(hidden), icon = VALUES(icon), singleton = VALUES(singleton);


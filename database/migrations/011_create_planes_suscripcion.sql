CREATE TABLE IF NOT EXISTS `planes_suscripcion` (
  `id` CHAR(36) NOT NULL,
  `nombre` VARCHAR(255) NOT NULL,
  `descripcion` TEXT,
  `precio_mensual` DECIMAL(10, 2) NOT NULL,
  `duracion_meses` INT NOT NULL,
  `stripe_price_id` VARCHAR(255) NOT NULL,
  `activo` BOOLEAN DEFAULT TRUE,
  `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

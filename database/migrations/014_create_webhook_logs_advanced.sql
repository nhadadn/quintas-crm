CREATE TABLE IF NOT EXISTS `webhook_logs` (
  `id` CHAR(36) NOT NULL,
  `evento_tipo` VARCHAR(255) NOT NULL,
  `stripe_event_id` VARCHAR(255) NOT NULL,
  `payload` JSON NOT NULL,
  `estado` VARCHAR(50) NOT NULL COMMENT 'pendiente, procesado, fallido',
  `intentos` INT DEFAULT 0,
  `ultimo_intento` TIMESTAMP NULL,
  `error_mensaje` TEXT,
  `procesado_en` TIMESTAMP NULL,
  `fecha_recepcion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

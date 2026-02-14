CREATE TABLE IF NOT EXISTS `reembolsos` (
  `id` CHAR(36) NOT NULL,
  `pago_id` CHAR(36) NOT NULL,
  `monto_reembolsado` DECIMAL(10, 2) NOT NULL,
  `razon` VARCHAR(255) NOT NULL,
  `estado` VARCHAR(50) NOT NULL COMMENT 'pendiente, aprobado, rechazado, procesado',
  `solicitado_por` CHAR(36),
  `aprobado_por` CHAR(36),
  `stripe_refund_id` VARCHAR(255),
  `fecha_solicitud` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `fecha_aprobacion` TIMESTAMP NULL,
  `fecha_procesado` TIMESTAMP NULL,
  `notas` TEXT,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_reembolsos_pagos` FOREIGN KEY (`pago_id`) REFERENCES `pagos`(`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

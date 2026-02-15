
CREATE TABLE IF NOT EXISTS `stripe_webhooks_logs` (
  `id` char(36) NOT NULL,
  `stripe_event_id` varchar(255) NOT NULL,
  `event_type` varchar(255) NOT NULL,
  `payload` json NOT NULL,
  `processed` boolean DEFAULT false,
  `attempts` int DEFAULT 0,
  `last_error` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stripe_event_id_unique` (`stripe_event_id`)
);

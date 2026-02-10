-- Migration: 010_create_webhooks_schema.sql
-- Description: Implementación de sistema de Webhooks (Subscriptions & Delivery Logs)
-- Author: Backend Development Agent
-- Date: 2026-02-04

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------
-- Table: webhooks_subscriptions
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `webhooks_subscriptions` (
  `id` char(36) NOT NULL,
  `status` varchar(20) DEFAULT 'published',
  `sort` int(11) DEFAULT NULL,
  `user_created` char(36) DEFAULT NULL,
  `date_created` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `user_updated` char(36) DEFAULT NULL,
  `date_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `client_id` char(36) NOT NULL,
  `event_type` varchar(255) NOT NULL,
  `url` varchar(500) NOT NULL,
  `secret` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_success_at` timestamp NULL DEFAULT NULL,
  `last_failure_at` timestamp NULL DEFAULT NULL,
  `failure_count` int(11) DEFAULT 0,
  `created_by` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `webhooks_subscriptions_client_event_index` (`client_id`, `event_type`),
  CONSTRAINT `fk_webhooks_client` FOREIGN KEY (`client_id`) REFERENCES `oauth_clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_webhooks_created_by` FOREIGN KEY (`created_by`) REFERENCES `directus_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table: webhooks_delivery_logs
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `webhooks_delivery_logs` (
  `id` char(36) NOT NULL,
  `status` varchar(20) DEFAULT 'published', -- Directus standard field, reused for delivery status or kept as 'published'
  `date_created` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `subscription_id` char(36) NOT NULL,
  `event_type` varchar(255) NOT NULL,
  `payload` json DEFAULT NULL,
  `response_status` int(11) DEFAULT NULL,
  `response_body` text DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `attempts` int(11) DEFAULT 0,
  `next_retry_at` timestamp NULL DEFAULT NULL,
  `delivery_status` varchar(50) DEFAULT 'pending', -- pending, delivered, failed, retrying
  PRIMARY KEY (`id`),
  KEY `webhooks_logs_status_retry_index` (`delivery_status`, `next_retry_at`),
  KEY `webhooks_logs_subscription_index` (`subscription_id`),
  CONSTRAINT `fk_webhooks_logs_subscription` FOREIGN KEY (`subscription_id`) REFERENCES `webhooks_subscriptions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;

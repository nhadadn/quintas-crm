-- Migration: 009_create_oauth_schema.sql
-- Description: Implementación de tablas para OAuth 2.0 (Clients, Authorization Codes, Access Tokens, Refresh Tokens)
-- Author: Backend Development Agent
-- Date: 2026-02-04

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------
-- Table: oauth_clients
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `oauth_clients` (
  `id` char(36) NOT NULL,
  `status` varchar(20) DEFAULT 'published',
  `sort` int(11) DEFAULT NULL,
  `user_created` char(36) DEFAULT NULL,
  `date_created` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `user_updated` char(36) DEFAULT NULL,
  `date_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `client_id` varchar(255) NOT NULL,
  `client_secret` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `redirect_uris` json DEFAULT NULL,
  `scopes` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `rate_limit_per_hour` int(11) DEFAULT 1000,
  `created_by` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth_clients_client_id_unique` (`client_id`),
  KEY `oauth_clients_created_by_index` (`created_by`),
  CONSTRAINT `fk_oauth_clients_created_by` FOREIGN KEY (`created_by`) REFERENCES `directus_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table: oauth_authorization_codes
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `oauth_authorization_codes` (
  `id` char(36) NOT NULL,
  `status` varchar(20) DEFAULT 'published',
  `date_created` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `code` varchar(255) NOT NULL,
  `client_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `redirect_uri` varchar(255) DEFAULT NULL,
  `scopes` json DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth_authorization_codes_code_unique` (`code`),
  KEY `oauth_authorization_codes_expires_at_index` (`expires_at`),
  CONSTRAINT `fk_oauth_codes_client` FOREIGN KEY (`client_id`) REFERENCES `oauth_clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_oauth_codes_user` FOREIGN KEY (`user_id`) REFERENCES `directus_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table: oauth_access_tokens
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `oauth_access_tokens` (
  `id` char(36) NOT NULL,
  `status` varchar(20) DEFAULT 'published',
  `date_created` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `access_token` varchar(255) NOT NULL,
  `client_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `scopes` json DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth_access_tokens_token_unique` (`access_token`),
  KEY `oauth_access_tokens_expires_at_index` (`expires_at`),
  CONSTRAINT `fk_oauth_tokens_client` FOREIGN KEY (`client_id`) REFERENCES `oauth_clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_oauth_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `directus_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------
-- Table: oauth_refresh_tokens
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `oauth_refresh_tokens` (
  `id` char(36) NOT NULL,
  `status` varchar(20) DEFAULT 'published',
  `date_created` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `refresh_token` varchar(255) NOT NULL,
  `client_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `scopes` json DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `revoked` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth_refresh_tokens_token_unique` (`refresh_token`),
  KEY `oauth_refresh_tokens_expires_at_index` (`expires_at`),
  CONSTRAINT `fk_oauth_refresh_client` FOREIGN KEY (`client_id`) REFERENCES `oauth_clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_oauth_refresh_user` FOREIGN KEY (`user_id`) REFERENCES `directus_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;

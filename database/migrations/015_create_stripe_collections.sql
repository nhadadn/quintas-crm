-- Migration: 015_create_stripe_collections.sql
-- Description: Create stripe_subscriptions, stripe_refunds, and stripe_invoices tables
-- Context: Area 6.1.1 Modelado de Datos para Suscripciones y Reembolsos

SET NAMES utf8mb4;

-- 1. Create stripe_subscriptions table
CREATE TABLE IF NOT EXISTS `stripe_subscriptions` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NULL COMMENT 'Relación con directus_users',
  `customer_id` VARCHAR(255) NOT NULL COMMENT 'ID de cliente en Stripe',
  `subscription_id` VARCHAR(255) NOT NULL COMMENT 'ID de suscripción en Stripe',
  `subscription_item_id` VARCHAR(255) NULL COMMENT 'ID de item de suscripción en Stripe',
  `price_id` VARCHAR(255) NULL COMMENT 'ID de precio en Stripe',
  `product_id` VARCHAR(255) NULL COMMENT 'ID de producto en Stripe',
  `status` VARCHAR(50) NOT NULL COMMENT 'active, trialing, past_due, canceled, incomplete, incomplete_expired, unpaid',
  `current_period_start` TIMESTAMP NULL,
  `current_period_end` TIMESTAMP NULL,
  `cancel_at_period_end` BOOLEAN DEFAULT FALSE,
  `canceled_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_stripe_subscriptions_user` FOREIGN KEY (`user_id`) REFERENCES `directus_users`(`id`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes for stripe_subscriptions
CREATE INDEX `idx_stripe_subscriptions_user` ON `stripe_subscriptions`(`user_id`);
CREATE INDEX `idx_stripe_subscriptions_stripe_id` ON `stripe_subscriptions`(`subscription_id`);
CREATE INDEX `idx_stripe_subscriptions_customer` ON `stripe_subscriptions`(`customer_id`);
CREATE INDEX `idx_stripe_subscriptions_status` ON `stripe_subscriptions`(`status`);

-- 2. Create stripe_refunds table
CREATE TABLE IF NOT EXISTS `stripe_refunds` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NULL COMMENT 'Relación con directus_users',
  `payment_intent_id` VARCHAR(255) NULL COMMENT 'ID del PaymentIntent original',
  `refund_id` VARCHAR(255) NOT NULL COMMENT 'ID de reembolso en Stripe',
  `charge_id` VARCHAR(255) NULL COMMENT 'ID del cargo original',
  `amount` INT NOT NULL COMMENT 'Monto en centavos',
  `currency` VARCHAR(3) NOT NULL DEFAULT 'mxn',
  `status` VARCHAR(50) NOT NULL COMMENT 'pending, succeeded, failed, canceled',
  `reason` VARCHAR(50) NULL COMMENT 'duplicate, fraudulent, requested_by_customer, expired, refund_failed',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_stripe_refunds_user` FOREIGN KEY (`user_id`) REFERENCES `directus_users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_stripe_refunds_amount` CHECK (`amount` >= 0)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes for stripe_refunds
CREATE INDEX `idx_stripe_refunds_user` ON `stripe_refunds`(`user_id`);
CREATE INDEX `idx_stripe_refunds_stripe_id` ON `stripe_refunds`(`refund_id`);
CREATE INDEX `idx_stripe_refunds_payment_intent` ON `stripe_refunds`(`payment_intent_id`);

-- 3. Create stripe_invoices table
CREATE TABLE IF NOT EXISTS `stripe_invoices` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NULL COMMENT 'Relación con directus_users',
  `customer_id` VARCHAR(255) NOT NULL COMMENT 'ID de cliente en Stripe',
  `subscription_id` VARCHAR(255) NULL,
  `invoice_id` VARCHAR(255) NOT NULL COMMENT 'ID de factura en Stripe',
  `number` VARCHAR(50) NULL COMMENT 'Número de factura',
  `status` VARCHAR(50) NOT NULL COMMENT 'draft, open, paid, uncollectible, void',
  `amount_due` INT NOT NULL DEFAULT 0,
  `amount_paid` INT NOT NULL DEFAULT 0,
  `amount_remaining` INT NOT NULL DEFAULT 0,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'mxn',
  `hosted_invoice_url` TEXT NULL,
  `invoice_pdf` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_stripe_invoices_user` FOREIGN KEY (`user_id`) REFERENCES `directus_users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_stripe_invoices_amount_due` CHECK (`amount_due` >= 0),
  CONSTRAINT `chk_stripe_invoices_amount_paid` CHECK (`amount_paid` >= 0)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes for stripe_invoices
CREATE INDEX `idx_stripe_invoices_user` ON `stripe_invoices`(`user_id`);
CREATE INDEX `idx_stripe_invoices_customer` ON `stripe_invoices`(`customer_id`);
CREATE INDEX `idx_stripe_invoices_stripe_id` ON `stripe_invoices`(`invoice_id`);
CREATE INDEX `idx_stripe_invoices_subscription` ON `stripe_invoices`(`subscription_id`);

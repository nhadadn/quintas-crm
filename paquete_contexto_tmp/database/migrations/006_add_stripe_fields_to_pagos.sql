-- Migration: 006_add_stripe_fields_to_pagos.sql
-- Description: Agregar campos para integración con Stripe y optimización de búsquedas
-- Date: 2026-02-03

SET NAMES utf8mb4;

-- Agregar columnas necesarias para Stripe
ALTER TABLE `pagos`
ADD COLUMN `stripe_payment_intent_id` VARCHAR(255) NULL COMMENT 'ID del PaymentIntent de Stripe',
ADD COLUMN `stripe_customer_id` VARCHAR(255) NULL COMMENT 'ID del Customer en Stripe',
ADD COLUMN `stripe_last4` VARCHAR(4) NULL COMMENT 'Últimos 4 dígitos de la tarjeta',
ADD COLUMN `metodo_pago_detalle` JSON NULL COMMENT 'Detalles adicionales del método de pago (marca, tipo, etc)';

-- Crear índice para búsquedas rápidas por payment intent
CREATE INDEX `idx_pagos_stripe_pi` ON `pagos` (`stripe_payment_intent_id`);

-- Crear índice compuesto para evitar duplicidad lógica en pagos
CREATE INDEX `idx_pagos_venta_numero` ON `pagos` (`venta_id`, `numero_pago`);

-- Update suscripciones table to support Stripe subscriptions fully
-- We are adding fields. Note: We are keeping plan_id as is for now, assuming it might need to link to planes_suscripcion logically.

ALTER TABLE `suscripciones`
ADD COLUMN `stripe_customer_id` VARCHAR(255) AFTER `stripe_subscription_id`,
ADD COLUMN `fecha_cancelacion` DATE AFTER `fecha_fin`,
ADD COLUMN `metadata` JSON AFTER `fecha_cancelacion`;

-- Note: In a real scenario we might want to drop the FK to planes_pagos if we strictly use planes_suscripcion, 
-- but we'll leave it for safety unless it blocks inserts.

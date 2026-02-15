-- Migration: 023_backfill_pagos_movimientos.sql
-- Description: Backfill de movimientos iniciales en pagos_movimientos desde pagos
-- Nota: Solo inserta movimientos para pagos que tienen cuota en amortizacion
--       y que aun no han sido migrados (pm.pago_id IS NULL).

SET NAMES utf8mb4;

INSERT INTO `pagos_movimientos` (
  `id`,
  `pago_id`,
  `venta_id`,
  `numero_pago`,
  `fecha_movimiento`,
  `monto`,
  `tipo`,
  `estatus`,
  `stripe_payment_intent_id`,
  `stripe_customer_id`,
  `stripe_last4`,
  `metodo_pago_detalle`,
  `notas`
)
SELECT
  UUID() AS `id`,
  p.`id` AS `pago_id`,
  p.`venta_id`,
  p.`numero_pago`,
  COALESCE(p.`fecha_pago`, a.`fecha_vencimiento`, NOW()) AS `fecha_movimiento`,
  CASE
    WHEN p.`monto_pagado` IS NOT NULL AND p.`monto_pagado` > 0 THEN p.`monto_pagado`
    ELSE p.`monto`
  END AS `monto`,
  'abono' AS `tipo`,
  CASE
    WHEN p.`estatus` = 'cancelado' THEN 'cancelado'
    ELSE 'aplicado'
  END AS `estatus`,
  p.`stripe_payment_intent_id`,
  p.`stripe_customer_id`,
  p.`stripe_last4`,
  p.`metodo_pago_detalle`,
  p.`notas`
FROM `pagos` p
JOIN `amortizacion` a
  ON a.`venta_id` = p.`venta_id`
 AND a.`numero_pago` = p.`numero_pago`
LEFT JOIN `pagos_movimientos` pm
  ON pm.`pago_id` = p.`id`
WHERE pm.`id` IS NULL;


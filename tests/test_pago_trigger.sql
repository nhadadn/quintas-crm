-- tests/test_pago_trigger.sql
-- Script de prueba manual para validar el trigger trg_pagos_after_update_propagation
-- Objetivo: demostrar que al actualizar pagos.estatus a 'pagado', la fila correspondiente
--           en amortizacion se sincroniza automaticamente (estatus, monto_pagado, fecha_pago).

SET NAMES utf8mb4;

-- =============================================
-- Seccion 0: Pre-check de integridad de datos
-- =============================================
-- Este bloque detecta posibles registros huerfanos donde exista un pago con
-- (venta_id, numero_pago) sin una fila correspondiente en amortizacion.

SELECT 'PRE-CHECK: Pagos sin cuota de amortizacion asociada (venta_id, numero_pago)' AS descripcion;

SELECT p.`id`, p.`venta_id`, p.`numero_pago`, p.`estatus`
FROM `pagos` p
LEFT JOIN `amortizacion` a
  ON a.`venta_id` = p.`venta_id`
 AND a.`numero_pago` = p.`numero_pago`
WHERE a.`id` IS NULL
LIMIT 50;

-- Si la consulta anterior devuelve filas, el trigger no podra sincronizar esas cuotas
-- porque no existe registro en amortizacion. Se recomienda corregir estos datos antes
-- de depender del comportamiento automatizado.

-- =============================================
-- Seccion 1: Preparacion de datos de prueba
-- =============================================

START TRANSACTION;

-- Deshabilitar FK temporalmente para facilitar la insercion de datos de prueba aislados
SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

-- IDs fijos para esta prueba
SET @venta_id := 'venta-trigger-test-0001';
SET @cliente_id := 'cliente-trigger-test-0001';
SET @vendedor_id := 'vendedor-trigger-test-0001';
SET @lote_id := 999999;

-- Cliente de prueba
INSERT INTO `clientes` (`id`, `estatus`, `nombre`, `apellido_paterno`, `email`)
VALUES (@cliente_id, 'activo', 'Cliente', 'Trigger', 'cliente.trigger@test.local')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- Vendedor de prueba
INSERT INTO `vendedores` (`id`, `nombre`, `email`, `comision_porcentaje`, `activo`)
VALUES (@vendedor_id, 'Vendedor Trigger', 'vendedor.trigger@test.local', 5.00, 1)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- Lote de prueba (si no existe ya)
INSERT INTO `lotes` (`id`, `estatus`)
VALUES (@lote_id, 'disponible')
ON DUPLICATE KEY UPDATE `estatus` = `estatus`;

-- Venta de prueba
INSERT INTO `ventas` (
  `id`, `lote_id`, `cliente_id`, `vendedor_id`,
  `fecha_venta`, `monto_total`, `enganche`, `monto_financiado`,
  `plazo_meses`, `tasa_interes`, `estatus`
)
VALUES (
  @venta_id, @lote_id, @cliente_id, @vendedor_id,
  CURRENT_DATE(), 100000.00, 10000.00, 90000.00,
  12, 12.00, 'pagos'
)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- Cuota de amortizacion de prueba (numero_pago = 1)
SET @amortizacion_id := 'amortizacion-trigger-test-0001';

INSERT INTO `amortizacion` (
  `id`, `venta_id`, `numero_pago`, `fecha_vencimiento`,
  `monto_cuota`, `interes`, `capital`,
  `saldo_inicial`, `saldo_final`, `estatus`, `monto_pagado`
)
VALUES (
  @amortizacion_id, @venta_id, 1, DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY),
  10000.00, 900.00, 9100.00,
  90000.00, 80900.00, 'pendiente', 0.00
)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- Pago asociado a la cuota 1, inicialmente en estado 'pendiente'
SET @pago_id := 'pago-trigger-test-0001';

INSERT INTO `pagos` (
  `id`, `venta_id`, `numero_pago`, `fecha_vencimiento`,
  `monto`, `monto_pagado`, `mora`, `estatus`
)
VALUES (
  @pago_id, @venta_id, 1, DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY),
  10000.00, 0.00, 0.00, 'pendiente'
)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- Restaurar validacion de llaves foraneas
SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

-- =============================================
-- Seccion 2: Ejecucion de la prueba del trigger
-- =============================================

-- Prueba POSITIVA: cambio de estatus y monto_pagado debe sincronizar amortizacion
SELECT 'TEST POSITIVO - amortizacion se actualiza cuando cambia estatus/monto_pagado' AS descripcion;

-- Ver estado inicial de la cuota de amortizacion
SELECT `id`, `venta_id`, `numero_pago`, `estatus`, `monto_pagado`, `fecha_pago`
FROM `amortizacion`
WHERE `id` = @amortizacion_id;

-- Actualizar el pago a 'pagado' y registrar monto_pagado + fecha_pago
UPDATE `pagos`
SET `estatus` = 'pagado',
    `monto_pagado` = 10000.00,
    `fecha_pago` = NOW()
WHERE `id` = @pago_id;

-- Ver estado final de la cuota para verificar que el trigger se ejecuto
SELECT `id`, `venta_id`, `numero_pago`, `estatus`, `monto_pagado`, `fecha_pago`
FROM `amortizacion`
WHERE `id` = @amortizacion_id;

-- Prueba NEGATIVA: actualizar solo notas no debe afectar amortizacion
SELECT 'TEST NEGATIVO - actualizacion solo de notas, amortizacion NO debe cambiar' AS descripcion;

-- Capturar estado actual de amortizacion para comparacion visual
SELECT `id`, `venta_id`, `numero_pago`, `estatus`, `monto_pagado`, `fecha_pago`
FROM `amortizacion`
WHERE `id` = @amortizacion_id;

-- Actualizar unicamente el campo notas en pagos
UPDATE `pagos`
SET `notas` = 'Actualizacion solo notas (test trigger)',
    `updated_at` = NOW()
WHERE `id` = @pago_id;

-- Verificar que la cuota de amortizacion permanece sin cambios
SELECT `id`, `venta_id`, `numero_pago`, `estatus`, `monto_pagado`, `fecha_pago`
FROM `amortizacion`
WHERE `id` = @amortizacion_id;

-- =============================================
-- Seccion 3: Limpieza / rollback
-- =============================================

-- Para no dejar datos de prueba permanentes, revertimos la transaccion
ROLLBACK;

-- Fin del script de prueba del trigger

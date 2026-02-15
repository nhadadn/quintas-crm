-- tests/test_pagos_movimientos_trigger.sql
-- Objetivo: validar triggers en pagos_movimientos para pagos parciales y reembolsos
-- Escenarios:
--  1) Tres movimientos parciales que culminan en cuota pagada.
--  2) Un movimiento de reembolso que reduce el monto pagado y regresa la cuota a parcial.
--  3) DELETE de un movimiento recalcula monto_pagado.
--  4) Intento de insertar monto negativo es rechazado por CHECK.
--  5) Cambio de llave (venta_id/numero_pago) se considera operacion no soportada a nivel de negocio.

SET NAMES utf8mb4;

START TRANSACTION;

SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

-- IDs de prueba
SET @venta_id := 'venta-ledger-test-0001';
SET @cliente_id := 'cliente-ledger-test-0001';
SET @vendedor_id := 'vendedor-ledger-test-0001';
SET @lote_id := 999998;
SET @amortizacion_id := 'amortizacion-ledger-test-0001';

-- Cliente de prueba
INSERT INTO `clientes` (`id`, `estatus`, `nombre`, `apellido_paterno`, `email`)
VALUES (@cliente_id, 'activo', 'Cliente', 'Ledger', 'cliente.ledger@test.local')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- Vendedor de prueba
INSERT INTO `vendedores` (`id`, `nombre`, `email`, `comision_porcentaje`, `activo`)
VALUES (@vendedor_id, 'Vendedor Ledger', 'vendedor.ledger@test.local', 5.00, 1)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- Lote de prueba
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
  CURRENT_DATE(), 9000.00, 0.00, 9000.00,
  1, 0.00, 'pagos'
)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- Cuota de amortizacion unica por 9000
INSERT INTO `amortizacion` (
  `id`, `venta_id`, `numero_pago`, `fecha_vencimiento`,
  `monto_cuota`, `interes`, `capital`,
  `saldo_inicial`, `saldo_final`, `estatus`, `monto_pagado`
)
VALUES (
  @amortizacion_id, @venta_id, 1, DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY),
  9000.00, 0.00, 9000.00,
  9000.00, 0.00, 'pendiente', 0.00
)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

-- =============================================
-- Seccion 1: Tres movimientos parciales hasta completar cuota
-- =============================================

SELECT 'TEST LEDGER POSITIVO - tres abonos parciales hasta pagado' AS descripcion;

-- Estado inicial
SELECT `id`, `venta_id`, `numero_pago`, `estatus`, `monto_pagado`, `fecha_pago`
FROM `amortizacion`
WHERE `id` = @amortizacion_id;

-- Primer movimiento: 3000 (parcial)
INSERT INTO `pagos_movimientos` (
  `id`, `venta_id`, `numero_pago`, `fecha_movimiento`,
  `monto`, `tipo`, `estatus`, `notas`
) VALUES (
  'mov-ledger-1', @venta_id, 1, NOW(),
  3000.00, 'abono', 'aplicado', 'Primer abono parcial'
);

SELECT 'Despues del primer movimiento' AS etapa;
SELECT `id`, `venta_id`, `numero_pago`, `estatus`, `monto_pagado`, `fecha_pago`
FROM `amortizacion`
WHERE `id` = @amortizacion_id;

-- Segundo movimiento: 3000 (sigue parcial)
INSERT INTO `pagos_movimientos` (
  `id`, `venta_id`, `numero_pago`, `fecha_movimiento`,
  `monto`, `tipo`, `estatus`, `notas`
) VALUES (
  'mov-ledger-2', @venta_id, 1, NOW(),
  3000.00, 'abono', 'aplicado', 'Segundo abono parcial'
);

SELECT 'Despues del segundo movimiento' AS etapa;
SELECT `id`, `venta_id`, `numero_pago`, `estatus`, `monto_pagado`, `fecha_pago`
FROM `amortizacion`
WHERE `id` = @amortizacion_id;

-- Tercer movimiento: 3000 (total = 9000, debe quedar pagado)
INSERT INTO `pagos_movimientos` (
  `id`, `venta_id`, `numero_pago`, `fecha_movimiento`,
  `monto`, `tipo`, `estatus`, `notas`
) VALUES (
  'mov-ledger-3', @venta_id, 1, NOW(),
  3000.00, 'abono', 'aplicado', 'Tercer abono; completa la cuota'
);

SELECT 'Despues del tercer movimiento (cuota debe estar pagada)' AS etapa;
SELECT `id`, `venta_id`, `numero_pago`, `estatus`, `monto_pagado`, `fecha_pago`
FROM `amortizacion`
WHERE `id` = @amortizacion_id;

-- =============================================
-- Seccion 2: Reembolso que reduce el monto pagado
-- =============================================

SELECT 'TEST LEDGER REEMBOLSO - reembolso reduce monto pagado y estado vuelve a parcial' AS descripcion;

-- Movimiento de reembolso por 1000
INSERT INTO `pagos_movimientos` (
  `id`, `venta_id`, `numero_pago`, `fecha_movimiento`,
  `monto`, `tipo`, `estatus`, `notas`
) VALUES (
  'mov-ledger-4', @venta_id, 1, NOW(),
  1000.00, 'reembolso', 'aplicado', 'Reembolso de 1000'
);

SELECT 'Despues del reembolso (monto_pagado debe bajar y estatus parcial)' AS etapa;
SELECT `id`, `venta_id`, `numero_pago`, `estatus`, `monto_pagado`, `fecha_pago`
FROM `amortizacion`
WHERE `id` = @amortizacion_id;

-- =============================================
-- Seccion 3: DELETE de movimiento y recalculo
-- =============================================

SELECT 'TEST DELETE - eliminar un abono y recalcular monto_pagado' AS descripcion;

-- Agregar un abono extra de 1000 para llevar la cuota nuevamente a pagado
INSERT INTO `pagos_movimientos` (
  `id`, `venta_id`, `numero_pago`, `fecha_movimiento`,
  `monto`, `tipo`, `estatus`, `notas`
) VALUES (
  'mov-ledger-5', @venta_id, 1, NOW(),
  1000.00, 'abono', 'aplicado', 'Abono adicional para probar DELETE'
);

SELECT 'Antes de borrar el abono extra' AS etapa;
SELECT `id`, `venta_id`, `numero_pago`, `estatus`, `monto_pagado`, `fecha_pago`
FROM `amortizacion`
WHERE `id` = @amortizacion_id;

-- Borrar el abono extra y verificar que monto_pagado disminuye
DELETE FROM `pagos_movimientos`
WHERE `id` = 'mov-ledger-5';

SELECT 'Despues de borrar el abono extra (monto_pagado debe reflejar la suma restante)' AS etapa;
SELECT `id`, `venta_id`, `numero_pago`, `estatus`, `monto_pagado`, `fecha_pago`
FROM `amortizacion`
WHERE `id` = @amortizacion_id;

-- =============================================
-- Seccion 4: Movimiento para cuota inexistente (debe fallar por FK)
-- =============================================

SELECT 'TEST NEGATIVO - intento de insertar movimiento para cuota inexistente (debe fallar)' AS descripcion;

-- Esta sentencia debe fallar debido a la FK compuesta hacia amortizacion(venta_id, numero_pago)
-- Se deja sin manejo de errores a proposito para observar el fallo en ejecucion manual
INSERT INTO `pagos_movimientos` (
  `id`, `venta_id`, `numero_pago`, `fecha_movimiento`,
  `monto`, `tipo`, `estatus`, `notas`
) VALUES (
  'mov-ledger-cuota-inexistente', @venta_id, 99, NOW(),
  100.00, 'abono', 'aplicado', 'Este movimiento debe ser rechazado por FK a amortizacion'
);

-- =============================================
-- Seccion 5: Cambio de llave (venta_id/numero_pago)
-- =============================================

SELECT 'TEST CAMBIO DE LLAVE - esta operacion no esta soportada a nivel de negocio' AS descripcion;

-- Por simplicidad y para evitar complejidad extra en los triggers, el modelo
-- asume que (venta_id, numero_pago) de un movimiento NO cambian una vez creado.
-- Esta restriccion debe aplicarse en la capa de aplicacion/Directus (campos read-only).
-- Si se requiere soportar cambios de llave, se recomienda manejarlo via
-- procedimiento almacenado dedicado que realice el recalculo de ambas cuotas.

-- Ejemplo de operacion NO soportada (comentada intencionalmente):
-- UPDATE `pagos_movimientos`
-- SET `numero_pago` = 2
-- WHERE `id` = 'mov-ledger-1';

-- =============================================
-- Seccion 6: Limpieza
-- =============================================

ROLLBACK;

-- Fin de tests/test_pagos_movimientos_trigger.sql


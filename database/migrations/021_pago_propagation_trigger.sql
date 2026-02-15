-- Migration: 021_pago_propagation_trigger.sql
-- Description: Trigger para propagar cambios de pagos hacia amortizacion
-- Objetivo: Mantener sincronizados estatus, monto_pagado y fecha_pago usando (venta_id, numero_pago)

SET NAMES utf8mb4;

-- Eliminar trigger previo si existe para permitir re-ejecucion segura de migraciones
DROP TRIGGER IF EXISTS `trg_pagos_after_update_propagation`;

-- Nota tecnica:
--  * Se usa AFTER UPDATE porque la logica de negocio depende del estado final del registro
--    (valores NEW ya validados por el motor y por cualquier constraint CHECK/FK).
--  * BEFORE UPDATE no garantiza que los cambios se hayan aplicado correctamente ni que
--    otras restricciones se hayan evaluado; ademas, podria interferir con logica de
--    aplicacion que asume que el UPDATE ya se confirmo.
--  * Este trigger solo se ejecuta de forma efectiva cuando cambian el estatus o el
--    monto_pagado, evitando escrituras innecesarias sobre la tabla amortizacion y
--    reduciendo riesgo de contencion.
--  * Riesgo de race conditions: si procesos concurrentes actualizan pagos y
--    amortizacion directamente, podria haber condiciones de carrera. Por diseno, la
--    aplicacion no debe escribir en amortizacion de forma directa para campos de
--    estado/monto, dejando al trigger como unica fuente de verdad en la capa SQL.
CREATE TRIGGER `trg_pagos_after_update_propagation`
AFTER UPDATE ON `pagos`
FOR EACH ROW
  UPDATE `amortizacion`
  SET
    `estatus` = CASE
      -- Transiciones explicitas clave
      WHEN OLD.`estatus` = 'pendiente' AND NEW.`estatus` = 'pagado' THEN 'pagado'
      WHEN OLD.`estatus` = 'pendiente' AND NEW.`estatus` = 'parcial' THEN 'parcial'
      -- Rollback de cuota: si un pago previamente pagado pasa a cancelado,
      -- la cuota vuelve a estado pendiente.
      WHEN OLD.`estatus` = 'pagado' AND NEW.`estatus` = 'cancelado' THEN 'pendiente'
      -- Fallback general: reflejar el estatus unificado tal cual
      ELSE CASE NEW.`estatus`
        WHEN 'pagado' THEN 'pagado'
        WHEN 'parcial' THEN 'parcial'
        WHEN 'pendiente' THEN 'pendiente'
        WHEN 'vencido' THEN 'vencido'
        WHEN 'cancelado' THEN 'cancelado'
        ELSE `estatus`
      END
    END,
    `monto_pagado` = CASE
      -- Rollback financiero: al cancelar un pago ya marcado como pagado, se revierte
      -- el monto pagado en la cuota.
      WHEN OLD.`estatus` = 'pagado' AND NEW.`estatus` = 'cancelado' THEN 0
      ELSE NEW.`monto_pagado`
    END,
    `fecha_pago` = CASE
      -- Igual que con el monto, si se cancela un pago previamente aplicado,
      -- se limpia la fecha de pago registrada.
      WHEN OLD.`estatus` = 'pagado' AND NEW.`estatus` = 'cancelado' THEN NULL
      ELSE NEW.`fecha_pago`
    END
  WHERE `venta_id` = NEW.`venta_id`
    AND `numero_pago` = NEW.`numero_pago`
    -- Hardening: solo se ejecuta cuando hay cambio real en estatus o monto_pagado
    AND (OLD.`estatus` <> NEW.`estatus` OR OLD.`monto_pagado` <> NEW.`monto_pagado`);

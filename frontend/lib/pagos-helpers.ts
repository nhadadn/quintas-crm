import { PagoPerfil, VentaPerfil, MovimientoPerfil } from './perfil-api';

/**
 * Agrega los pagos de todas las ventas de un cliente, manejando casos de datos faltantes.
 * @param ventas Array de ventas del perfil del cliente
 * @returns Array de pagos con conceptos generados
 */
export function agregarPagosDeVentas(ventas: VentaPerfil[] | undefined | null): PagoPerfil[] {
  // Defensive check: return empty array if ventas is null/undefined
  if (!ventas || !Array.isArray(ventas)) {
    return [];
  }

  const allPagos: PagoPerfil[] = [];

  for (const venta of ventas) {
    if (!venta || !venta.pagos || !Array.isArray(venta.pagos)) {
      continue;
    }

    const pagosProcesados = venta.pagos
      .map((pago): PagoPerfil | null => {
        if (!pago) return null;

        // Safe access to lote properties
        const numeroLote = venta.lote_id?.numero_lote || 'N/A';

        // Generate default concept if missing
        const concepto =
          pago.concepto ||
          (pago.numero_parcialidad
            ? `Parcialidad ${pago.numero_parcialidad} - Lote ${numeroLote}`
            : `Pago a Capital - Lote ${numeroLote}`);

        return {
          ...pago,
          concepto,
          venta_id: venta.id,
          numero_lote: numeroLote,
        };
      })
      .filter((p): p is PagoPerfil => p !== null);

    allPagos.push(...pagosProcesados);
  }

  return allPagos;
}

/**
 * Agrega movimientos del ledger de todas las ventas para mostrar historial.
 * Sustituye el uso de pagos directos para reflejar exactamente lo calculado por la BD.
 */
export function agregarMovimientosDeVentas(
  ventas: VentaPerfil[] | undefined | null,
): PagoPerfil[] {
  if (!ventas || !Array.isArray(ventas)) return [];

  const all: PagoPerfil[] = [];

  for (const venta of ventas) {
    const numeroLote = (venta as any)?.lote_id?.numero_lote || 'N/A';
    const movimientos = (venta as any)?.pagos_movimientos as MovimientoPerfil[] | undefined;
    if (!Array.isArray(movimientos)) continue;

    for (const mov of movimientos) {
      const isReembolso = String(mov.tipo).toLowerCase() === 'reembolso';
      const monto = Number(mov.monto || 0) * (isReembolso ? -1 : 1);
      const concepto = isReembolso
        ? `Reembolso cuota ${mov.numero_pago} - Lote ${numeroLote}`
        : `Abono cuota ${mov.numero_pago} - Lote ${numeroLote}`;
      all.push({
        id: Number.isFinite(Number(mov.id)) ? (mov as any).id : Date.now(), // fallback
        fecha_pago: mov.fecha_movimiento,
        monto,
        concepto,
        estatus: isReembolso ? 'pagado' : 'pagado',
        numero_parcialidad: mov.numero_pago,
        venta_id: (venta as any).id,
        numero_lote: numeroLote,
      });
    }
  }

  // Orden descendente por fecha
  all.sort(
    (a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime(),
  );
  return all;
}

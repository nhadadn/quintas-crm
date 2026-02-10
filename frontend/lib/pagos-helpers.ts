import { PagoPerfil, VentaPerfil } from './perfil-api';

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

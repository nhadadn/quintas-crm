import { useMemo } from 'react';
import { usePerfilCliente } from './usePerfilCliente';
import { PagoPerfil } from '@/lib/perfil-api';

export function usePagosCliente(token: string | null) {
  const { perfil, loading, error } = usePerfilCliente(token);

  const pagos = useMemo(() => {
    if (!perfil?.ventas) return [];

    return perfil.ventas.flatMap((venta) =>
      (venta.pagos || []).map((pago) => ({
        ...pago,
        venta_id: venta.id,
        numero_lote: venta.lote_id?.numero_lote,
      })),
    ) as PagoPerfil[];
  }, [perfil]);

  const filterPagos = (estado: string) => {
    if (estado === 'todos') return pagos;
    return pagos.filter((p) => p.estatus?.toLowerCase() === estado.toLowerCase());
  };

  return { pagos, loading, error, filterPagos };
}

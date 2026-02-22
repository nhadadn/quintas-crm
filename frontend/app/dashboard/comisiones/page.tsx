import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { fetchComisionesByVendedor } from '@/lib/comisiones-api';
import { getVendedorById } from '@/lib/vendedores-api';
import type { Comision } from '@/types/erp';
import { MisComisionesClient } from './MisComisionesClient';

function ensureComisionesDelVendedor(comisiones: Comision[], vendedorId: string): Comision[] {
  return comisiones.filter((c) => {
    const vendedorField: any = c.vendedor_id;
    const id = typeof vendedorField === 'object' ? vendedorField?.id : vendedorField;
    return String(id) === vendedorId;
  });
}

function calcularKPIs(comisiones: Comision[]) {
  return comisiones.reduce(
    (acc, curr) => {
      const monto = Number(curr.monto_comision || 0) || 0;
      acc.total += monto;
      if (curr.estatus === 'pagada') {
        acc.pagadas += monto;
      } else if (curr.estatus === 'pendiente') {
        acc.pendientes += monto;
      }
      return acc;
    },
    { total: 0, pagadas: 0, pendientes: 0 },
  );
}

export default async function DashboardComisionesPage() {
  const session = await auth();

  if (!session?.accessToken || !session.user?.vendedorId) {
    redirect('/portal/auth/login');
  }

  const token = session.accessToken;
  const vendedorId = String(session.user.vendedorId);

  const [vendedor, comisionesRaw] = await Promise.all([
    getVendedorById(vendedorId, token),
    fetchComisionesByVendedor(vendedorId, token),
  ]);

  const comisiones = ensureComisionesDelVendedor(comisionesRaw, vendedorId);
  const kpis = calcularKPIs(comisiones);

  const vendedorConFecha = {
    ...vendedor,
    fechaRegistro: (vendedor as any).created_at || (vendedor as any).date_created || null,
  };

  return <MisComisionesClient vendedor={vendedorConFecha} comisiones={comisiones} kpis={kpis} />;
}

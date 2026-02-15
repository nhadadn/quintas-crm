import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const headers = authHeader ? { Authorization: authHeader } : {};
  const tenantId = request.headers.get('X-Tenant-ID') || undefined;

  try {
    const response = await axios.get(`${DIRECTUS_URL}/items/ventas`, {
      headers,
      params: {
        'filter[estatus][_neq]': 'cancelada',
        fields: 'vendedor_id.id,vendedor_id.nombre,vendedor_id.apellido_paterno,monto_total',
        limit: -1,
        ...(tenantId ? { 'filter[tenant_id][_eq]': tenantId } : {}),
      },
    });

    const ventas = response.data.data;

    // Aggregate by Vendedor
    const ventasPorVendedorMap = new Map();

    ventas.forEach((venta: any) => {
      // Handle case where vendedor_id might be null or deleted
      const vendedor = venta.vendedor_id;
      const vendedorId = vendedor?.id || 'unknown';
      const vendedorNombre = vendedor
        ? `${vendedor.nombre} ${vendedor.apellido_paterno}`
        : 'Sin Asignar';

      if (!ventasPorVendedorMap.has(vendedorId)) {
        ventasPorVendedorMap.set(vendedorId, {
          vendedor_id: vendedorId,
          nombre: vendedorNombre,
          total_ventas: 0,
          cantidad_ventas: 0,
        });
      }

      const entry = ventasPorVendedorMap.get(vendedorId);
      entry.total_ventas += Number(venta.monto_total);
      entry.cantidad_ventas += 1;
    });

    const ventasPorVendedor = Array.from(ventasPorVendedorMap.values())
      .sort((a: any, b: any) => b.total_ventas - a.total_ventas)
      .slice(0, 10); // Top 10

    return NextResponse.json({ data: ventasPorVendedor });
  } catch (error: any) {
    console.error('Error fetching Ventas Por Vendedor:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Error fetching data', details: error.message },
      { status: 500 },
    );
  }
}

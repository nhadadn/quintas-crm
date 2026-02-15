import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '10';
  const authHeader = request.headers.get('Authorization');
  const headers = authHeader ? { Authorization: authHeader } : {};
  const tenantId = request.headers.get('X-Tenant-ID') || undefined;

  try {
    const response = await axios.get(`${DIRECTUS_URL}/items/ventas`, {
      headers,
      params: {
        fields:
          'id,fecha_venta,monto_total,estatus,cliente_id.nombre,cliente_id.apellido_paterno,vendedor_id.nombre,vendedor_id.apellido_paterno,lote_id.numero_lote',
        sort: '-fecha_venta',
        limit: limit,
        ...(tenantId ? { 'filter[tenant_id][_eq]': tenantId } : {}),
      },
    });

    const ventas = response.data.data.map((venta: any) => ({
      id: venta.id,
      fecha: venta.fecha_venta,
      monto: Number(venta.monto_total),
      estatus: venta.estatus,
      cliente: {
        nombre: venta.cliente_id?.nombre || '',
        apellido_paterno: venta.cliente_id?.apellido_paterno || '',
      },
      vendedor: {
        first_name: venta.vendedor_id?.nombre || '',
        last_name: venta.vendedor_id?.apellido_paterno || '',
      },
      lote: {
        numero_lote: venta.lote_id?.numero_lote || 'N/A',
      },
    }));

    return NextResponse.json({ data: ventas });
  } catch (error: any) {
    console.error('Error fetching Ventas Recientes:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Error fetching data', details: error.message },
      { status: 500 },
    );
  }
}

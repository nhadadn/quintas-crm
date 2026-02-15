import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const headers = authHeader ? { Authorization: authHeader } : {};
  const tenantId = request.headers.get('X-Tenant-ID') || undefined;

  try {
    const response = await axios.get(`${DIRECTUS_URL}/items/pagos`, {
      headers,
      params: {
        'aggregate[sum]': 'monto',
        'aggregate[count]': '*',
        'groupBy[]': 'estatus',
        ...(tenantId ? { 'filter[tenant_id][_eq]': tenantId } : {}),
      },
    });

    // Transform Directus response to match PagosPorEstatus interface
    const pagosPorEstatus = response.data.data.map((item: any) => ({
      estatus: item.estatus,
      total_monto: Number(item.sum?.monto || 0),
      cantidad: Number(item.count || 0),
    }));

    return NextResponse.json({ data: pagosPorEstatus });
  } catch (error: any) {
    console.error('Error fetching Pagos Por Estatus:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Error fetching data', details: error.message },
      { status: 500 },
    );
  }
}

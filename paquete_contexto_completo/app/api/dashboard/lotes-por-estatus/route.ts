import { NextResponse } from 'next/server';
import axios from 'axios';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

export async function GET(request: Request) {
  let headers: Record<string, string> = {};
  const tenantId = request.headers.get('X-Tenant-ID') || undefined;
  try {
    const session = await auth();
    if (session?.accessToken) {
      headers = { Authorization: `Bearer ${session.accessToken}` };
    } else {
      const authHeader = request.headers.get('Authorization');
      if (authHeader) headers = { Authorization: authHeader };
    }
  } catch {}

  try {
    let lotes = [];

    try {
      // Intento 1: Obtener estatus y precio_total
      const response = await axios.get(`${DIRECTUS_URL}/items/lotes`, {
        headers,
        params: {
          fields: 'estatus,precio_total',
          limit: -1,
          ...(tenantId ? { 'filter[tenant_id][_eq]': tenantId } : {}),
        },
      });
      lotes = response.data.data;
    } catch (error: any) {
      // Si falla por 403 (Forbidden), probablemente no tenemos acceso a precio_total
      // Intentamos obtener SOLO el estatus para al menos mostrar conteos
      if (error.response?.status === 403) {
        console.warn('Acceso denegado a precio_total en Lotes. Reintentando solo con estatus...');
        const retryResponse = await axios.get(`${DIRECTUS_URL}/items/lotes`, {
          headers,
          params: {
            fields: 'estatus', // Sin precio_total
            limit: -1,
            ...(tenantId ? { 'filter[tenant_id][_eq]': tenantId } : {}),
          },
        });
        lotes = retryResponse.data.data;
      } else {
        // Si es otro error, lo relanzamos
        throw error;
      }
    }

    // Agregación manual en servidor
    const aggregationMap = lotes.reduce((acc: any, lote: any) => {
      const estatus = lote.estatus || 'desconocido';

      if (!acc[estatus]) {
        acc[estatus] = {
          estatus,
          total_valor: 0,
          cantidad: 0,
        };
      }

      acc[estatus].cantidad += 1;
      // Solo sumamos si existe precio_total (será undefined en el fallback)
      acc[estatus].total_valor += Number(lote.precio_total || 0);

      return acc;
    }, {});

    const lotesPorEstatus = Object.values(aggregationMap);

    return NextResponse.json({ data: lotesPorEstatus });
  } catch (error: any) {
    console.error('Error fetching Lotes Por Estatus:', error.response?.data || error.message);
    const status = error.response?.status ?? 503;
    const message =
      error.response?.data?.errors?.[0]?.message || error.message || 'Service Unavailable';
    return NextResponse.json(
      { error: 'Error fetching data', details: message, code: status },
      { status },
    );
  }
}

import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const headers = authHeader ? { Authorization: authHeader } : {};
  const tenantId = request.headers.get('X-Tenant-ID') || undefined;

  try {
    const response = await axios.get(`${DIRECTUS_URL}/items/comisiones`, {
      headers,
      params: {
        fields: 'monto_comision,estatus,venta_id,vendedor_id.nombre,vendedor_id.apellido_paterno',
        limit: -1,
        ...(tenantId ? { 'filter[tenant_id][_eq]': tenantId } : {}),
      },
    });

    const comisiones = response.data.data;

    // Agregación en memoria por vendedor
    const aggregationMap = comisiones.reduce((acc: any, comision: any) => {
      // Manejo seguro del nombre del vendedor
      const nombreVendedor = comision.vendedor_id
        ? `${comision.vendedor_id.nombre || ''} ${comision.vendedor_id.apellido_paterno || ''}`.trim()
        : 'Sin Asignar';

      if (!acc[nombreVendedor]) {
        acc[nombreVendedor] = {
          vendedor: nombreVendedor,
          total_comision: 0,
          ventas_count: new Set(), // Usamos Set para contar ventas únicas
          pendiente_pago: 0,
        };
      }

      const monto = Number(comision.monto_comision || 0);

      acc[nombreVendedor].total_comision += monto;
      if (comision.venta_id) {
        acc[nombreVendedor].ventas_count.add(comision.venta_id);
      }

      if (comision.estatus === 'pendiente') {
        acc[nombreVendedor].pendiente_pago += monto;
      }

      return acc;
    }, {});

    const data = Object.values(aggregationMap).map((item: any) => ({
      ...item,
      ventas_count: item.ventas_count.size,
    }));

    // Ordenar por total de comisión descendente
    data.sort((a: any, b: any) => b.total_comision - a.total_comision);

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error fetching Comisiones Por Vendedor:', error.response?.data || error.message);
    // En caso de error (ej. colección no existe), devolvemos array vacío para no romper el dashboard
    // pero logueamos el error. O devolvemos el error 500 si es crítico.
    // Dado que el usuario reportó errores 500, mejor devolvemos 500 con detalles.
    const status = error.response?.status || 500;
    return NextResponse.json(
      {
        error: 'Error fetching data',
        details: error.message,
      },
      { status },
    );
  }
}

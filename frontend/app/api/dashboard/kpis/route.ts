import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const headers = authHeader ? { Authorization: authHeader } : {};

  try {
    const today = new Date();
    const firstDayCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const firstDayPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastDayPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];

    const [
      totalVentasRes,
      totalPagadoRes,
      totalPendienteRes,
      ventasMesActualRes,
      ventasMesAnteriorRes,
      lotesVendidosMesRes,
      comisionesPendientesRes
    ] = await Promise.all([
      // 1. Total Ventas (All time, non-cancelled)
      axios.get(`${DIRECTUS_URL}/items/ventas`, {
        headers,
        params: {
          'aggregate[sum]': 'monto_total',
          'filter[estatus][_neq]': 'cancelada'
        }
      }),
      // 2. Total Pagado
      axios.get(`${DIRECTUS_URL}/items/pagos`, {
        headers,
        params: {
          'aggregate[sum]': 'monto_pagado',
          'filter[estatus][_eq]': 'pagado'
        }
      }),
      // 3. Total Pendiente (Pagos pendientes)
      axios.get(`${DIRECTUS_URL}/items/pagos`, {
        headers,
        params: {
          'aggregate[sum]': 'monto',
          'filter[estatus][_neq]': 'pagado'
        }
      }),
      // 4. Ventas Mes Actual (Sum)
      axios.get(`${DIRECTUS_URL}/items/ventas`, {
        headers,
        params: {
          'aggregate[sum]': 'monto_total',
          'filter[fecha_venta][_gte]': firstDayCurrentMonth,
          'filter[estatus][_neq]': 'cancelada'
        }
      }),
      // 5. Ventas Mes Anterior (Sum) for growth
      axios.get(`${DIRECTUS_URL}/items/ventas`, {
        headers,
        params: {
          'aggregate[sum]': 'monto_total',
          'filter[fecha_venta][_between]': [firstDayPrevMonth, lastDayPrevMonth],
          'filter[estatus][_neq]': 'cancelada'
        }
      }),
      // 6. Lotes Vendidos Mes (Count)
      axios.get(`${DIRECTUS_URL}/items/ventas`, {
        headers,
        params: {
          'aggregate[count]': '*',
          'filter[fecha_venta][_gte]': firstDayCurrentMonth,
          'filter[estatus][_neq]': 'cancelada'
        }
      }),
      // 7. Comisiones Pendientes
      axios.get(`${DIRECTUS_URL}/items/comisiones`, {
        headers,
        params: {
          'aggregate[sum]': 'monto_comision',
          'filter[estatus][_eq]': 'pendiente'
        }
      })
    ]);

    const totalVentas = Number(totalVentasRes.data.data[0]?.sum?.monto_total) || 0;
    const totalPagado = Number(totalPagadoRes.data.data[0]?.sum?.monto_pagado) || 0;
    const totalPendiente = Number(totalPendienteRes.data.data[0]?.sum?.monto) || 0;
    const ventasMesActual = Number(ventasMesActualRes.data.data[0]?.sum?.monto_total) || 0;
    const ventasMesAnterior = Number(ventasMesAnteriorRes.data.data[0]?.sum?.monto_total) || 0;
    const lotesVendidosMes = Number(lotesVendidosMesRes.data.data[0]?.count) || 0;
    const comisionesPendientes = Number(comisionesPendientesRes.data.data[0]?.sum?.monto_comision) || 0;

    // Calculate growth
    let crecimiento = 0;
    if (ventasMesAnterior > 0) {
      crecimiento = ((ventasMesActual - ventasMesAnterior) / ventasMesAnterior) * 100;
    } else if (ventasMesActual > 0) {
      crecimiento = 100;
    }

    const kpis = {
      total_ventas: totalVentas,
      total_pagado: totalPagado,
      total_pendiente: totalPendiente,
      ventas_mes_actual: ventasMesActual,
      crecimiento_mes_anterior: crecimiento,
      lotes_vendidos_mes: lotesVendidosMes,
      comisiones_pendientes: comisionesPendientes,
    };

    return NextResponse.json({ data: kpis });
  } catch (error: any) {
    console.error('Error fetching KPIs:', error.response?.data || error.message);
    // Return mock data as fallback if connection fails, but log error
    // Or return error to show in UI. Let's return error to make it obvious.
    return NextResponse.json({ error: 'Error fetching KPIs', details: error.message }, { status: 500 });
  }
}

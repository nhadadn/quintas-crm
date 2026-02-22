import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const STATIC_TOKEN = process.env.NEXT_PUBLIC_DIRECTUS_STATIC_TOKEN;

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const headers =
    STATIC_TOKEN && STATIC_TOKEN.length > 0
      ? { Authorization: `Bearer ${STATIC_TOKEN}` }
      : authHeader
        ? { Authorization: authHeader }
        : {};
  const tenantId = request.headers.get('X-Tenant-ID') || undefined;

  try {
    const today = new Date();
    const firstDayCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const firstDayPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      .toISOString()
      .split('T')[0];
    const lastDayPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0)
      .toISOString()
      .split('T')[0];

    const [
      totalContratadoRes,
      totalPagadoResFromView,
      ventasMesActualResFromView,
      ventasMesAnteriorResFromView,
      lotesVendidosMesResFromView,
      comisionesPendientesRes,
    ] = await Promise.all([
      // 1. Total Contratado (all time, non-cancelled) desde vista
      axios.get(`${DIRECTUS_URL}/items/v_dashboard_kpis`, {
        headers,
        params: {
          'aggregate[sum]': 'total_contratado',
          'filter[estatus][_neq]': 'cancelada',
          ...(tenantId ? { 'filter[tenant_id][_eq]': tenantId } : {}),
        },
      }),
      // 2. Total Pagado desde vista (suma de movimientos aplicados)
      axios.get(`${DIRECTUS_URL}/items/v_dashboard_kpis`, {
        headers,
        params: {
          'aggregate[sum]': 'total_pagado',
          'filter[estatus][_neq]': 'cancelada',
          ...(tenantId ? { 'filter[tenant_id][_eq]': tenantId } : {}),
        },
      }),
      // 3. Ventas Mes Actual (Sum total_contratado) desde vista
      axios.get(`${DIRECTUS_URL}/items/v_dashboard_kpis`, {
        headers,
        params: {
          'aggregate[sum]': 'total_contratado',
          'filter[fecha_venta][_gte]': firstDayCurrentMonth,
          'filter[estatus][_neq]': 'cancelada',
          ...(tenantId ? { 'filter[tenant_id][_eq]': tenantId } : {}),
        },
      }),
      // 4. Ventas Mes Anterior (Sum total_contratado) desde vista
      axios.get(`${DIRECTUS_URL}/items/v_dashboard_kpis`, {
        headers,
        params: {
          'aggregate[sum]': 'total_contratado',
          'filter[fecha_venta][_between]': [firstDayPrevMonth, lastDayPrevMonth],
          'filter[estatus][_neq]': 'cancelada',
          ...(tenantId ? { 'filter[tenant_id][_eq]': tenantId } : {}),
        },
      }),
      // 5. Lotes Vendidos Mes (Count) desde vista (una fila por venta)
      axios.get(`${DIRECTUS_URL}/items/v_dashboard_kpis`, {
        headers,
        params: {
          'aggregate[count]': '*',
          'filter[fecha_venta][_gte]': firstDayCurrentMonth,
          'filter[estatus][_neq]': 'cancelada',
          ...(tenantId ? { 'filter[tenant_id][_eq]': tenantId } : {}),
        },
      }),
      // 6. Comisiones Pendientes (sin cambio)
      axios.get(`${DIRECTUS_URL}/items/comisiones`, {
        headers,
        params: {
          'aggregate[sum]': 'monto_comision',
          'filter[estatus][_eq]': 'pendiente',
          ...(tenantId ? { 'filter[tenant_id][_eq]': tenantId } : {}),
        },
      }),
    ]);

    const totalContratado = Number(totalContratadoRes.data.data[0]?.sum?.total_contratado) || 0;
    const totalPagado = Number(totalPagadoResFromView.data.data[0]?.sum?.total_pagado) || 0;
    const totalPendiente = Math.max(0, totalContratado - totalPagado);
    const ventasMesActual =
      Number(ventasMesActualResFromView.data.data[0]?.sum?.total_contratado) || 0;
    const ventasMesAnterior =
      Number(ventasMesAnteriorResFromView.data.data[0]?.sum?.total_contratado) || 0;
    const lotesVendidosMes = Number(lotesVendidosMesResFromView.data.data[0]?.count) || 0;
    const comisionesPendientes =
      Number(comisionesPendientesRes.data.data[0]?.sum?.monto_comision) || 0;

    // Calculate growth
    let crecimiento = 0;
    if (ventasMesAnterior > 0) {
      crecimiento = ((ventasMesActual - ventasMesAnterior) / ventasMesAnterior) * 100;
    } else if (ventasMesActual > 0) {
      crecimiento = 100;
    }

    const kpis = {
      total_ventas: totalContratado,
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
    return NextResponse.json(
      { error: 'Error fetching KPIs', details: error.message },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const headers = authHeader ? { Authorization: authHeader } : {};

  try {
    // Obtener todas las ventas con fecha y monto
    // Limitamos a un número razonable o filtramos por fecha si es necesario (ej. último año)
    // Por ahora traemos todo para armar el histórico
    const response = await axios.get(`${DIRECTUS_URL}/items/ventas`, {
      headers,
      params: {
        fields: 'fecha_venta,monto_total',
        sort: 'fecha_venta',
        limit: -1, // Traer todas para generar el gráfico completo
        filter: {
          estatus: {
            _neq: 'cancelada' // Excluir canceladas del gráfico de ventas
          }
        }
      }
    });

    const ventas = response.data.data;

    // Agregación por mes (YYYY-MM)
    const aggregationMap = ventas.reduce((acc: any, venta: any) => {
      if (!venta.fecha_venta) return acc;

      // Extraer YYYY-MM
      // Asumiendo formato ISO o YYYY-MM-DD
      const mes = venta.fecha_venta.substring(0, 7); 

      if (!acc[mes]) {
        acc[mes] = {
          mes,
          total_ventas: 0,
          cantidad_ventas: 0
        };
      }

      acc[mes].total_ventas += Number(venta.monto_total || 0);
      acc[mes].cantidad_ventas += 1;

      return acc;
    }, {});

    // Convertir a array y ordenar cronológicamente
    const data = Object.values(aggregationMap).sort((a: any, b: any) => {
      return a.mes.localeCompare(b.mes);
    });

    // Opcional: Limitar a los últimos 12 meses si hay muchos datos
    // const ultimos12Meses = data.slice(-12);

    return NextResponse.json({ data });

  } catch (error: any) {
    console.error('Error fetching Ventas Por Mes:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    return NextResponse.json({ 
      error: 'Error fetching data', 
      details: error.message 
    }, { status });
  }
}

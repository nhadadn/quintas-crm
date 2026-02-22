import { FilaAmortizacion, Pago, MovimientoPago } from '@/types/erp';
import axios from 'axios';
import { directusClient, DirectusResponse, handleAxiosError } from './directus-api';

export function calcularAmortizacion(
  montoFinanciado: number,
  tasaAnual: number,
  plazoMeses: number,
  fechaInicio: Date = new Date(),
): FilaAmortizacion[] {
  const tasaMensual = tasaAnual / 100 / 12;
  let cuota = 0;
  if (tasaMensual > 0) {
    cuota =
      (montoFinanciado * tasaMensual * Math.pow(1 + tasaMensual, plazoMeses)) /
      (Math.pow(1 + tasaMensual, plazoMeses) - 1);
  } else {
    cuota = montoFinanciado / plazoMeses;
  }
  let saldo = montoFinanciado;
  const tabla: FilaAmortizacion[] = [];
  for (let i = 1; i <= plazoMeses; i++) {
    const interes = saldo * tasaMensual;
    const capital = cuota - interes;
    saldo -= capital;
    const fecha = new Date(fechaInicio);
    fecha.setMonth(fechaInicio.getMonth() + i);
    tabla.push({
      numero_pago: i,
      fecha_vencimiento: fecha.toISOString().split('T')[0] as string,
      cuota,
      interes,
      capital,
      saldo_restante: Math.max(0, saldo),
      estatus: 'pendiente',
    });
  }
  return tabla;
}

function genId(): string {
  const g: any = globalThis as any;
  if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function fetchAmortizacionByVenta(
  ventaId: string,
  token?: string,
): Promise<FilaAmortizacion[]> {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await directusClient.get<DirectusResponse<any[]>>('/items/amortizacion', {
      params: {
        filter: { venta_id: { _eq: ventaId } },
        sort: ['numero_pago'],
        limit: -1,
        fields: [
          'numero_pago',
          'fecha_vencimiento',
          'monto_cuota',
          'interes',
          'capital',
          'saldo_final',
          'estatus',
        ],
      },
      headers,
    });
    const rows = res.data?.data || [];
    return rows.map((r) => ({
      numero_pago: Number(r.numero_pago),
      fecha_vencimiento: String(r.fecha_vencimiento),
      cuota: Number(r.monto_cuota),
      interes: Number(r.interes),
      capital: Number(r.capital),
      saldo_restante: Number(r.saldo_final),
      estatus: r.estatus,
    })) as FilaAmortizacion[];
  } catch (error) {
    handleAxiosError(error, 'fetchAmortizacionByVenta');
    return [];
  }
}

export async function fetchPagos(params: any = {}, token?: string): Promise<Pago[]> {
  try {
    const response = await directusClient.get<DirectusResponse<Pago[]>>('/items/pagos', {
      params: {
        ...params,
        limit: params.limit || -1,
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchPagos');
    return [];
  }
}

export async function fetchMovimientos(
  params: any = {},
  token?: string,
): Promise<MovimientoPago[]> {
  try {
    const response = await directusClient.get<DirectusResponse<MovimientoPago[]>>(
      '/items/pagos_movimientos',
      {
        params: { limit: params.limit || -1, sort: params.sort || ['-fecha_movimiento'], ...params },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchMovimientos');
    return [];
  }
}

export async function getPagoById(id: string, token?: string): Promise<Pago> {
  try {
    const response = await directusClient.get<DirectusResponse<Pago>>(`/items/pagos/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      params: {
        fields: '*.*.*', // Fetch related data (venta, cliente, etc.)
      },
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'getPagoById');
    throw error;
  }
}

export async function createPaymentIntent(
  monto: number,
  pagoId: number | string,
  clienteId: string,
  token?: string,
) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await directusClient.post(
      '/pagos/create-payment-intent',
      {
        pago_id: pagoId,
        monto,
        cliente_id: clienteId,
      },
      { headers },
    );
    return response.data;
  } catch (error) {
    handleAxiosError(error, 'createPaymentIntent');
    throw error;
  }
}

export async function registrarPagoManual(
  data: {
    venta_id?: string | number;
    pago_id?: string | number;
    monto: number;
    fecha_pago: string;
    metodo_pago: string;
    referencia?: string;
    notas?: string;
  },
  token?: string,
) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (!data.venta_id) throw new Error('venta_id es obligatorio para registrar pago manual');
    const ventaId = String(data.venta_id);
    try {
      const body = {
        venta_id: ventaId,
        monto: Number(data.monto),
        metodo_pago: data.metodo_pago,
        fecha_pago: data.fecha_pago,
        concepto: data.notas || undefined,
      };
      const response = await directusClient.post('/pagos/registrar-manual', body, { headers });
      return response.data;
    } catch (e: any) {
      const status = e?.response?.status;
      if (status !== 404) throw e;
    }
    const cuotasRes = await directusClient.get<DirectusResponse<any[]>>('/items/amortizacion', {
      params: { filter: { venta_id: { _eq: ventaId } }, limit: 1, fields: ['numero_pago'] },
      headers,
    });
    const tieneCuotas = Array.isArray(cuotasRes.data?.data) && cuotasRes.data.data.length > 0;
    if (!tieneCuotas) throw new Error('No existen cuotas de amortización para esta venta');
    const nextRes = await directusClient.get<DirectusResponse<any[]>>('/items/amortizacion', {
      params: {
        filter: { venta_id: { _eq: ventaId }, estatus: { _in: ['pendiente', 'parcial'] } },
        sort: ['numero_pago'],
        limit: 1,
        fields: ['numero_pago'],
      },
      headers,
    });
    const nextCuota = nextRes.data?.data?.[0];
    if (!nextCuota?.numero_pago && !data.pago_id) {
      throw new Error('No hay cuotas pendientes para esta venta');
    }
    const movimiento = {
      id: genId(),
      venta_id: ventaId,
      numero_pago: nextCuota?.numero_pago ?? 1,
      monto: Number(data.monto),
      fecha_movimiento: data.fecha_pago,
      tipo: 'abono',
      estatus: 'aplicado',
      metodo_pago_detalle: { metodo: data.metodo_pago, referencia: data.referencia },
      notas: data.notas,
      pago_id: data.pago_id ?? null,
    };
    const mvRes = await directusClient.post<DirectusResponse<any>>(
      '/items/pagos_movimientos',
      movimiento,
      { headers },
    );
    return { data: mvRes.data.data };
  } catch (error) {
    handleAxiosError(error, 'registrarPagoManual');
    throw error;
  }
}

export async function marcarComoPagado(pagoId: string | number, token?: string) {
  // Para marcar como pagado un pago existente sin crear uno nuevo,
  // podríamos usar el endpoint manual pasando el pago_id y el monto total pendiente.
  // Primero obtenemos el pago para saber el monto pendiente.
  try {
    const pago = await getPagoById(String(pagoId), token);
    if (!pago) throw new Error('Pago no encontrado');

    // Asumimos pago total
    const montoAPagar = Number(pago.monto) - Number(pago.monto_pagado || 0);

    if (montoAPagar <= 0) throw new Error('El pago ya está cubierto');

    return await registrarPagoManual(
      {
        pago_id: pagoId,
        venta_id: typeof pago.venta_id === 'object' ? pago.venta_id.id : pago.venta_id,
        monto: montoAPagar,
        fecha_pago: new Date().toISOString().split('T')[0],
        metodo_pago: 'efectivo', // Default, o pasar como param
        notas: 'Marcado como pagado desde gestión manual',
      },
      token,
    );
  } catch (error) {
    console.error('Error al marcar como pagado:', error);
    throw error;
  }
}

export async function descargarReporteIngresos(params: any, token?: string) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await directusClient.get('/pagos/reportes/ingresos', {
      params,
      headers,
      responseType: 'blob', // Importante para descarga de archivos
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error, 'descargarReporteIngresos');
    throw error;
  }
}

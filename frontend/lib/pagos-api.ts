import { FilaAmortizacion, Pago } from '@/types/erp';
import axios from 'axios';
import { directusClient, DirectusResponse, handleAxiosError } from './directus-api';

// Function to calculate amortization schedule based on parameters
export function calcularAmortizacion(
  montoFinanciado: number,
  tasaAnual: number,
  plazoMeses: number,
  fechaInicio: Date = new Date(),
): FilaAmortizacion[] {
  const tasaMensual = tasaAnual / 100 / 12;

  // PMT Formula: P * (r * (1 + r)^n) / ((1 + r)^n - 1)
  // If rate is 0, simple division
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
      cuota: cuota,
      interes: interes,
      capital: capital,
      saldo_restante: Math.max(0, saldo),
      estatus: 'pendiente',
    });
  }

  return tabla;
}

// Mock function to simulate API call
export async function generarTablaAmortizacion(venta_id: string): Promise<FilaAmortizacion[]> {
  await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate network delay

  // Mock data generation logic using the calculation function
  const montoFinanciado = 100000;
  const tasaAnual = 12; // 12%
  const plazoMeses = 12;

  return calcularAmortizacion(montoFinanciado, tasaAnual, plazoMeses);
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

export async function getPagoById(id: string, token?: string): Promise<Pago> {
  try {
    const response = await directusClient.get<DirectusResponse<Pago>>(`/items/pagos/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      params: {
        fields: '*.*.*' // Fetch related data (venta, cliente, etc.)
      }
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
) {
  try {
    const response = await directusClient.post('/pagos/create-payment-intent', {
      pago_id: pagoId,
      monto,
      cliente_id: clienteId,
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error, 'createPaymentIntent');
    throw error;
  }
}

export async function registrarPagoManual(data: {
  venta_id?: string | number;
  pago_id?: string | number;
  monto: number;
  fecha_pago: string;
  metodo_pago: string;
  referencia?: string;
  notas?: string;
}) {
  try {
    // El endpoint base POST /pagos maneja el registro manual
    const response = await directusClient.post('/pagos', data);
    return response.data;
  } catch (error) {
    handleAxiosError(error, 'registrarPagoManual');
    throw error;
  }
}

export async function marcarComoPagado(pagoId: string | number) {
  // Para marcar como pagado un pago existente sin crear uno nuevo, 
  // podríamos usar el endpoint manual pasando el pago_id y el monto total pendiente.
  // Primero obtenemos el pago para saber el monto pendiente.
  try {
    const pago = await getPagoById(String(pagoId));
    if (!pago) throw new Error('Pago no encontrado');
    
    // Asumimos pago total
    const montoAPagar = Number(pago.monto) - Number(pago.monto_pagado || 0);
    
    if (montoAPagar <= 0) throw new Error('El pago ya está cubierto');

    return await registrarPagoManual({
      pago_id: pagoId,
      venta_id: typeof pago.venta_id === 'object' ? pago.venta_id.id : pago.venta_id,
      monto: montoAPagar,
      fecha_pago: new Date().toISOString().split('T')[0],
      metodo_pago: 'efectivo', // Default, o pasar como param
      notas: 'Marcado como pagado desde gestión manual'
    });
  } catch (error) {
    console.error('Error al marcar como pagado:', error);
    throw error;
  }
}

export async function descargarReporteIngresos(params: any) {
    try {
        const response = await directusClient.get('/pagos/reportes/ingresos', {
            params,
            responseType: 'blob' // Importante para descarga de archivos
        });
        return response.data;
    } catch (error) {
        handleAxiosError(error, 'descargarReporteIngresos');
        throw error;
    }
}

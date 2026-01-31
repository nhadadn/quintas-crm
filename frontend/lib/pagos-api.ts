import { FilaAmortizacion, Pago } from '@/types/erp';
import { directusClient, DirectusResponse, handleAxiosError } from './directus-api';

// Function to calculate amortization schedule based on parameters
export function calcularAmortizacion(
  montoFinanciado: number,
  tasaAnual: number,
  plazoMeses: number,
  fechaInicio: Date = new Date()
): FilaAmortizacion[] {
  const tasaMensual = tasaAnual / 100 / 12;
  
  // PMT Formula: P * (r * (1 + r)^n) / ((1 + r)^n - 1)
  // If rate is 0, simple division
  let cuota = 0;
  if (tasaMensual > 0) {
    cuota = (montoFinanciado * tasaMensual * Math.pow(1 + tasaMensual, plazoMeses)) / (Math.pow(1 + tasaMensual, plazoMeses) - 1);
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
      estatus: 'pendiente'
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

export async function fetchPagos(): Promise<Pago[]> {
  try {
    const response = await directusClient.get<DirectusResponse<Pago[]>>('/items/pagos', {
      params: {
        fields: '*.*', // Obtener relaciones
        sort: '-fecha_vencimiento',
        limit: -1
      }
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchPagos');
  }
}

export async function getPagoById(id: string): Promise<Pago> {
  try {
    const response = await directusClient.get<DirectusResponse<Pago>>(`/items/pagos/${id}`, {
      params: {
        fields: '*.*.*' // Obtener relaciones profundas (Pago -> Venta -> Cliente/Lote)
      }
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'getPagoById');
  }
}


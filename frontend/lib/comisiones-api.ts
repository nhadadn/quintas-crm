import { Comision } from '@/types/erp';
import { directusClient, DirectusResponse, handleAxiosError } from './directus-api';

export interface CalculoComisionMeta {
  venta_id: string;
  vendedor: {
    id: string;
    nombre: string;
    esquema: string;
  };
  calculo: {
    monto_venta: number;
    base_calculo: {
      porcentaje: number;
      fijo: number;
    };
    comision_total: number;
  };
}

export interface CalculoComisionResponse {
  data: Partial<Comision>[];
  meta: CalculoComisionMeta;
}

/**
 * Calcula las comisiones para una venta específica
 * @param ventaId - ID de la venta
 * @returns Estructura con desglose de comisiones y metadatos del cálculo
 */
export async function calcularComisiones(
  ventaId: string,
  token?: string,
): Promise<CalculoComisionResponse> {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await directusClient.get<CalculoComisionResponse>('/comisiones/calcular', {
      params: { venta_id: ventaId },
      headers,
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error, 'calcularComisiones');
    throw error;
  }
}

/**
 * Obtiene el listado de comisiones existentes
 * @returns Lista de comisiones
 */
export async function fetchComisionesByVendedor(
  vendedorId: string,
  token?: string,
): Promise<Comision[]> {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await directusClient.get<DirectusResponse<Comision[]>>('/items/comisiones', {
      params: {
        filter: {
          vendedor_id: {
            _eq: vendedorId,
          },
        },
        fields: '*.*', // Obtener relaciones (venta, vendedor)
        sort: '-fecha_pago_programada',
        limit: -1,
      },
      headers,
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchComisionesByVendedor');
    return [];
  }
}

export async function fetchComisiones(token?: string): Promise<Comision[]> {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await directusClient.get<DirectusResponse<Comision[]>>('/items/comisiones', {
      params: {
        fields: '*.*', // Obtener relaciones (venta, vendedor)
        sort: '-fecha_pago_programada',
        limit: -1,
      },
      headers,
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchComisiones');
    throw error;
  }
}

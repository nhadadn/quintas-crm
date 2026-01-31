import { Venta } from '@/types/erp';
import { directusClient, DirectusResponse, handleAxiosError } from './directus-api';

export async function fetchVentas(): Promise<Venta[]> {
  try {
    const response = await directusClient.get<DirectusResponse<Venta[]>>('/items/ventas', {
      params: {
        fields: '*.*', // Obtener relaciones (cliente, vendedor, lote)
        sort: '-fecha_venta',
        limit: -1
      }
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchVentas');
  }
}

export async function getVentaById(id: string): Promise<Venta> {
  try {
    const response = await directusClient.get<DirectusResponse<Venta>>(`/items/ventas/${id}`, {
      params: {
        fields: '*.*' // Obtener relaciones
      }
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'getVentaById');
  }
}

export async function fetchVentasByClienteId(clienteId: string): Promise<Venta[]> {
  try {
    const response = await directusClient.get<DirectusResponse<Venta[]>>('/items/ventas', {
      params: {
        filter: {
          cliente_id: {
            _eq: clienteId
          }
        },
        fields: '*.*',
        sort: '-fecha_venta'
      }
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchVentasByClienteId');
    return [];
  }
}

export async function createVenta(venta: Partial<Venta>): Promise<Venta> {
  try {
    const response = await directusClient.post<DirectusResponse<Venta>>('/items/ventas', venta);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'createVenta');
  }
}

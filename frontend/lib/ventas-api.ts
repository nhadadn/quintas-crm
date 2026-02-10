import { Venta } from '@/types/erp';
import { directusClient, DirectusResponse, handleAxiosError } from './directus-api';

export async function fetchVentas(token?: string): Promise<Venta[]> {
  try {
    const response = await directusClient.get<DirectusResponse<Venta[]>>('/items/ventas', {
      params: {
        fields: '*.*', // Obtener relaciones (cliente, vendedor, lote)
        sort: '-fecha_venta',
        limit: -1,
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchVentas');
    return [];
  }
}

export async function getVentaById(id: string, token?: string): Promise<Venta> {
  try {
    const response = await directusClient.get<DirectusResponse<Venta>>(`/items/ventas/${id}`, {
      params: {
        fields: '*.*', // Obtener relaciones
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'getVentaById');
    throw error;
  }
}

export async function fetchVentasByClienteId(clienteId: string, token?: string): Promise<Venta[]> {
  try {
    const response = await directusClient.get<DirectusResponse<Venta[]>>('/items/ventas', {
      params: {
        filter: {
          cliente_id: {
            _eq: clienteId,
          },
        },
        fields: '*.*',
        sort: '-fecha_venta',
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchVentasByClienteId');
    return [];
  }
}

export async function createVenta(venta: Partial<Venta>, token?: string): Promise<Venta> {
  try {
    // Generar UUID manualmente si no viene en el objeto venta
    const uuid =
      venta.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (Math.random() * 16) | 0,
              v = c == 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          }));

    const payload = {
      ...venta,
      id: uuid,
    };

    const response = await directusClient.post<DirectusResponse<Venta>>('/items/ventas', payload, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'createVenta');
    throw error;
  }
}

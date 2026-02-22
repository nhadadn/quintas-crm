import { Venta } from '@/types/erp';
import { directusClient, DirectusResponse, handleAxiosError } from './directus-api';

export async function fetchVentas(token?: string): Promise<Venta[]> {
  try {
    const response = await directusClient.get<DirectusResponse<Venta[]>>('/items/ventas', {
      params: {
        fields: '*,lote_id.*,cliente_id.*,vendedor_id.*', // Incluir relaciones explícitas
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
        fields: '*,lote_id.*,cliente_id.*,vendedor_id.*', // Incluir lote completo y demás relaciones
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

    const montoTotal = Number(venta.monto_total ?? 0);
    const enganche = Number(venta.enganche ?? 0);
    const plazoMeses = Number(venta.plazo_meses ?? 0);
    const tasaInteres = venta.tasa_interes != null ? Number(venta.tasa_interes) : undefined;
    const principal = Math.max(0, montoTotal - enganche);
    const tipoVenta =
      plazoMeses > 0 && principal > 0
        ? 'financiado'
        : ((venta as any).tipo_venta || venta.metodo_pago || 'contado');
    const payload: any = {
      ...venta,
      id: uuid,
      monto_total: montoTotal,
      enganche,
      monto_financiado:
        venta.monto_financiado != null ? Number(venta.monto_financiado) : principal,
      plazo_meses: plazoMeses || venta.plazo_meses,
      tasa_interes: tasaInteres ?? venta.tasa_interes,
      tipo_plan: (venta as any).tipo_plan || 'frances',
      tipo_venta: tipoVenta,
    };

    const response = await directusClient.post<DirectusResponse<Venta>>('/items/ventas', payload, {
      params: {
        fields: 'id,lote_id,cliente_id',
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      validateStatus: (status) => status >= 200 && status < 300 || status === 204,
    });
    const data = (response as any)?.data?.data;
    if (data && data.id) return data;
    // Fallback para 204 No Content
    return {
      id: payload.id as any,
      lote_id: payload.lote_id as any,
      cliente_id: payload.cliente_id as any,
      fecha_venta: payload.fecha_venta as any,
      monto_total: payload.monto_total as any,
      enganche: payload.enganche as any,
      monto_financiado: payload.monto_financiado as any,
      plazo_meses: payload.plazo_meses as any,
      estatus: (payload as any).estatus || 'contrato',
      vendedor_id: payload.vendedor_id as any,
      metodo_pago: payload.metodo_pago as any,
    } as Venta;
  } catch (error) {
    handleAxiosError(error, 'createVenta');
    throw error;
  }
}

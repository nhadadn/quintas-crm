import { directusClient, DirectusResponse, handleAxiosError } from './directus-api';

export interface Reembolso {
  id: string;
  pago_id: string | any;
  monto_reembolsado: number;
  razon: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'procesado' | 'fallido';
  solicitado_por: string | any;
  fecha_solicitud: string;
  fecha_aprobacion?: string;
  fecha_rechazo?: string;
  aprobado_por?: string;
  rechazado_por?: string;
  notas?: string;
  stripe_refund_id?: string;
}

export async function fetchRefunds(params: any = {}, token?: string): Promise<Reembolso[]> {
  try {
    const response = await directusClient.get<DirectusResponse<Reembolso[]>>('/pagos/reembolsos', {
      params,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchRefunds');
    return [];
  }
}

export async function approveRefund(id: string, token?: string): Promise<any> {
  try {
    const response = await directusClient.post(
      `/pagos/reembolsos/${id}/aprobar`,
      {},
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    return response.data;
  } catch (error) {
    handleAxiosError(error, 'approveRefund');
    throw error;
  }
}

export async function rejectRefund(id: string, motivo: string, token?: string): Promise<any> {
  try {
    const response = await directusClient.post(
      `/pagos/reembolsos/${id}/rechazar`,
      { motivo },
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    return response.data;
  } catch (error) {
    handleAxiosError(error, 'rejectRefund');
    throw error;
  }
}

export async function requestRefund(
  data: { pago_id: string; monto: number; razon: string },
  token?: string,
): Promise<any> {
  try {
    const response = await directusClient.post('/pagos/reembolsos/solicitar', data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error, 'requestRefund');
    throw error;
  }
}

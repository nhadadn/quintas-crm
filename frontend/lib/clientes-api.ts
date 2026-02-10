import { Cliente } from '@/types/erp';
import { directusClient, DirectusResponse, handleAxiosError } from './directus-api';

export async function fetchClientes(page = 1, limit = 20, token?: string): Promise<{ data: Cliente[]; meta: any }> {
  try {
    const response = await directusClient.get<DirectusResponse<Cliente[]>>('/items/clientes', {
      params: {
        page,
        limit,
        sort: '-created_at',
        meta: '*',
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return {
      data: response.data.data,
      meta: response.data.meta,
    };
  } catch (error) {
    handleAxiosError(error, 'fetchClientes');
    return { data: [], meta: {} };
  }
}

export async function searchClientes(query: string, token?: string): Promise<Cliente[]> {
  try {
    const response = await directusClient.get<DirectusResponse<Cliente[]>>('/items/clientes', {
      params: {
        search: query,
        limit: 10,
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'searchClientes');
    return [];
  }
}

export async function createCliente(cliente: Omit<Cliente, 'id'>, token?: string): Promise<Cliente> {
  try {
    const response = await directusClient.post<DirectusResponse<Cliente>>(
      '/items/clientes',
      cliente,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'createCliente');
    throw error;
  }
}

export async function updateCliente(id: string, updates: Partial<Cliente>, token?: string): Promise<Cliente> {
  try {
    const response = await directusClient.patch<DirectusResponse<Cliente>>(
      `/items/clientes/${id}`,
      updates,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'updateCliente');
    throw error;
  }
}

export async function fetchClienteById(id: string, token?: string): Promise<Cliente> {
  try {
    const response = await directusClient.get<DirectusResponse<Cliente>>(`/items/clientes/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchClienteById');
    throw error;
  }
}

export async function findClienteByEmailOrRFC(
  email?: string,
  rfc?: string,
  telefono?: string,
  token?: string
): Promise<Cliente | null> {
  try {
    const filters = [];
    if (email) filters.push({ email: { _eq: email } });
    if (rfc) filters.push({ rfc: { _eq: rfc } });
    if (telefono) filters.push({ telefono: { _eq: telefono } });

    if (filters.length === 0) return null;

    const response = await directusClient.get<DirectusResponse<Cliente[]>>('/items/clientes', {
      params: {
        filter: {
          _or: filters,
        },
        limit: 1,
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (response.data.data && response.data.data.length > 0) {
      return response.data.data[0] ?? null;
    }
    return null;
  } catch (error) {
    handleAxiosError(error, 'findClienteByEmailOrRFC');
    return null;
  }
}

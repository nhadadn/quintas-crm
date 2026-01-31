import { Cliente } from '@/types/erp';
import { directusClient, DirectusResponse, handleAxiosError } from './directus-api';

export async function fetchClientes(page = 1, limit = 20): Promise<{ data: Cliente[], meta: any }> {
  try {
    const response = await directusClient.get<DirectusResponse<Cliente[]>>('/items/clientes', {
      params: {
        page,
        limit,
        sort: '-date_created',
        meta: '*'
      }
    });
    return {
      data: response.data.data,
      meta: response.data.meta
    };
  } catch (error) {
    handleAxiosError(error, 'fetchClientes');
    return { data: [], meta: {} };
  }
}

export async function searchClientes(query: string): Promise<Cliente[]> {
  try {
    const response = await directusClient.get<DirectusResponse<Cliente[]>>('/items/clientes', {
      params: {
        filter: {
          _or: [
            { nombre: { _icontains: query } },
            { apellido_paterno: { _icontains: query } },
            { email: { _icontains: query } },
            { rfc: { _icontains: query } }
          ]
        },
        limit: 10
      }
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'searchClientes');
    return [];
  }
}

export async function createCliente(cliente: Omit<Cliente, 'id'>): Promise<Cliente> {
  try {
    const response = await directusClient.post<DirectusResponse<Cliente>>('/items/clientes', cliente);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'createCliente');
    throw error;
  }
}

export async function updateCliente(id: string, updates: Partial<Cliente>): Promise<Cliente> {
  try {
    const response = await directusClient.patch<DirectusResponse<Cliente>>(`/items/clientes/${id}`, updates);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'updateCliente');
    throw error;
  }
}

export async function fetchClienteById(id: string): Promise<Cliente> {
  try {
    const response = await directusClient.get<DirectusResponse<Cliente>>(`/items/clientes/${id}`);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchClienteById');
    throw error;
  }
}

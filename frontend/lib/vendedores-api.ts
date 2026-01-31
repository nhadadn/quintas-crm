import { Vendedor } from '@/types/erp';
import { directusClient, DirectusResponse, handleAxiosError } from './directus-api';

export async function fetchVendedores(): Promise<Vendedor[]> {
  try {
    const response = await directusClient.get<DirectusResponse<Vendedor[]>>('/items/vendedores', {
      params: {
        sort: 'nombre',
        limit: -1
      }
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchVendedores');
    return [];
  }
}

export async function getVendedorById(id: string): Promise<Vendedor> {
  try {
    const response = await directusClient.get<DirectusResponse<Vendedor>>(`/items/vendedores/${id}`);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'getVendedorById');
    throw error;
  }
}

export async function createVendedor(vendedor: Omit<Vendedor, 'id'>): Promise<Vendedor> {
  try {
    const response = await directusClient.post<DirectusResponse<Vendedor>>('/items/vendedores', vendedor);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'createVendedor');
    throw error;
  }
}

export async function updateVendedor(id: string, updates: Partial<Vendedor>): Promise<Vendedor> {
  try {
    const response = await directusClient.patch<DirectusResponse<Vendedor>>(`/items/vendedores/${id}`, updates);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'updateVendedor');
    throw error;
  }
}

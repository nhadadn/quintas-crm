import { Vendedor } from '@/types/erp';
import { directusClient, DirectusResponse, handleAxiosError } from './directus-api';

export async function fetchVendedores(token?: string): Promise<Vendedor[]> {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await directusClient.get<DirectusResponse<Vendedor[]>>('/items/vendedores', {
      params: {
        sort: 'nombre',
        limit: -1,
      },
      headers,
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchVendedores');
    return [];
  }
}

export async function getVendedorById(id: string): Promise<Vendedor> {
  try {
    const response = await directusClient.get<DirectusResponse<Vendedor>>(
      `/items/vendedores/${id}`,
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'getVendedorById');
    throw error;
  }
}

export async function createVendedor(vendedor: Omit<Vendedor, 'id'>): Promise<Vendedor> {
  try {
    /**
     * 📝 NOTA TÉCNICA: Generación de ID en Cliente (Client-Side ID Generation)
     * ---------------------------------------------------------------------
     * ¿POR QUÉ?: La colección 'vendedores' en Directus tiene un campo 'id' obligatorio (PK),
     * pero la configuración actual del esquema no tiene activo el valor por defecto de autogeneración (UUID).
     *
     * ¿PARA QUÉ?: Generamos el UUID v4 explícitamente aquí para cumplir con la restricción NOT NULL
     * de la base de datos y evitar el error 400 "Validation failed for field 'id'".
     *
     * ¿ES SOLUCIÓN FINAL?: SÍ, es una solución robusta y definitiva.
     * - Ventajas: Permite conocer el ID antes de la creación (útil para UI optimista) y reduce carga en BD.
     * - Alternativa: Configurar "Special: UUID" en el Data Model de Directus (lado servidor),
     *   pero mantenerlo aquí garantiza funcionamiento independiente de la configuración del backend.
     */
    const uuid =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (Math.random() * 16) | 0,
              v = c == 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

    const payload = {
      ...vendedor,
      id: uuid,
    };
    const response = await directusClient.post<DirectusResponse<Vendedor>>(
      '/items/vendedores',
      payload,
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'createVendedor');
    throw error;
  }
}

export async function updateVendedor(id: string, updates: Partial<Vendedor>): Promise<Vendedor> {
  try {
    const response = await directusClient.patch<DirectusResponse<Vendedor>>(
      `/items/vendedores/${id}`,
      updates,
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'updateVendedor');
    throw error;
  }
}

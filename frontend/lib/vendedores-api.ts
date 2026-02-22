import { Vendedor } from '@/types/erp';
import { directusClient, DirectusResponse, handleAxiosError } from './directus-api';
import { createUserVendedor, deleteUser, findUserByEmail } from './users-api';

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

/**
 * Lista vendedores con información de acceso (user_id) para la vista de configuración.
 */
export async function listVendedoresForConfig(token?: string): Promise<any[]> {
  try {
    const adminToken = process.env.NEXT_PUBLIC_DIRECTUS_STATIC_TOKEN;
    const headers = adminToken
      ? { Authorization: `Bearer ${adminToken}` }
      : token
        ? { Authorization: `Bearer ${token}` }
        : {};
    const response = await directusClient.get<DirectusResponse<any[]>>('/items/vendedores', {
      params: {
        fields: 'id,nombre,apellido_paterno,apellido_materno,email,telefono,estatus,user_id',
        sort: 'nombre',
        limit: -1,
      },
      headers,
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'listVendedoresForConfig');
    return [];
  }
}

export async function getVendedorById(id: string, token?: string): Promise<Vendedor> {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await directusClient.get<DirectusResponse<Vendedor>>(
      `/items/vendedores/${id}`,
      { headers },
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'getVendedorById');
    throw error;
  }
}

export async function createVendedor(
  vendedor: Omit<Vendedor, 'id'>,
  token?: string,
): Promise<Vendedor> {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
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
      { headers },
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'createVendedor');
    throw error;
  }
}

export async function updateVendedor(
  id: string,
  updates: Partial<Vendedor>,
  token?: string,
): Promise<Vendedor> {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await directusClient.patch<DirectusResponse<Vendedor>>(
      `/items/vendedores/${id}`,
      updates,
      { headers },
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'updateVendedor');
    throw error;
  }
}

/**
 * Crea usuario de Directus con rol 'Vendedor' y el registro en 'vendedores' atómicamente.
 * - Verifica duplicado de email
 * - Rollback del usuario si falla la creación del vendedor
 */
export async function createVendedorConUsuario(
  payload: {
    nombre: string;
    apellido_paterno: string;
    apellido_materno?: string;
    email: string;
    telefono?: string;
    porcentaje_comision?: number;
    estatus?: 'Activo' | 'Inactivo' | string | number | boolean;
  },
  password: string,
  token?: string,
): Promise<any> {
  try {
    const exists = await findUserByEmail(payload.email, token);
    if (exists) {
      throw new Error('El email ya existe en Directus');
    }

    const user = await createUserVendedor(payload.email, password, token);
    if (!user?.id) {
      throw new Error('No se pudo crear el usuario');
    }

    try {
      const adminToken = process.env.NEXT_PUBLIC_DIRECTUS_STATIC_TOKEN;
      const headers = adminToken
        ? { Authorization: `Bearer ${adminToken}` }
        : token
          ? { Authorization: `Bearer ${token}` }
          : {};
      const vendedor = await directusClient.post<DirectusResponse<any>>(
        '/items/vendedores',
        {
          nombre: payload.nombre,
          apellido_paterno: payload.apellido_paterno,
          apellido_materno: payload.apellido_materno || null,
          email: payload.email,
          telefono: payload.telefono || null,
          porcentaje_comision: payload.porcentaje_comision ?? 5,
          estatus:
            typeof payload.estatus === 'string'
              ? payload.estatus.toLowerCase() === 'activo'
                ? 1
                : 0
              : payload.estatus
                ? 1
                : 0,
          user_id: user.id,
        },
        { headers },
      );
      return vendedor.data.data;
    } catch (e) {
      // Rollback: eliminar usuario creado
      await deleteUser(user.id, token);
      throw e;
    }
  } catch (error) {
    handleAxiosError(error, 'createVendedorConUsuario');
    throw error;
  }
}

/**
 * Vincula un vendedor existente sin cuenta a un usuario recién creado.
 */
export async function linkVendedorUsuario(
  vendedorId: string,
  userId: string,
  token?: string,
): Promise<any> {
  try {
    const adminToken = process.env.NEXT_PUBLIC_DIRECTUS_STATIC_TOKEN;
    const headers = adminToken
      ? { Authorization: `Bearer ${adminToken}` }
      : token
        ? { Authorization: `Bearer ${token}` }
        : {};
    const response = await directusClient.patch<DirectusResponse<any>>(
      `/items/vendedores/${vendedorId}`,
      { user_id: userId },
      { headers },
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'linkVendedorUsuario');
    throw error;
  }
}

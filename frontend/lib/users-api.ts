import { directusClient, DirectusResponse, handleAxiosError } from './directus-api';

export interface DirectusUser {
  id: string;
  email: string;
  role: string | { id: string; name?: string };
  status?: 'active' | 'invited' | 'draft' | 'suspended';
}

export interface DirectusRole {
  id: string;
  name: string;
}

export async function findUserByEmail(
  email: string,
  token?: string,
): Promise<DirectusUser | null> {
  try {
    // Preferir Static Token de servidor si está disponible (o público como fallback)
    const adminToken = process.env.DIRECTUS_STATIC_TOKEN || process.env.NEXT_PUBLIC_DIRECTUS_STATIC_TOKEN;
    const response = await directusClient.get<DirectusResponse<DirectusUser[]>>('/users', {
      params: {
        filter: { email: { _eq: email } },
        fields: ['id', 'email', 'role', 'status'],
        limit: 1,
      },
      headers: adminToken
        ? { Authorization: `Bearer ${adminToken}` }
        : token
          ? { Authorization: `Bearer ${token}` }
          : {},
    });
    const users = response.data.data;
    return users && users.length > 0 ? users[0] : null;
  } catch (error) {
    handleAxiosError(error, 'findUserByEmail');
  }
}

export async function getRoleIdByName(name: string, token?: string): Promise<string> {
  try {
    const adminToken = process.env.DIRECTUS_STATIC_TOKEN || process.env.NEXT_PUBLIC_DIRECTUS_STATIC_TOKEN;
    console.log('[getRoleIdByName] Token usado:', adminToken ? 'OK' : token ? 'OK(SESSION)' : 'VACÍO/UNDEFINED');
    // 1) Intento directo (nombre exacto)
    {
      const response = await directusClient.get<DirectusResponse<DirectusRole[]>>('/roles', {
        params: {
          filter: { name: { _eq: name } },
          fields: ['id', 'name'],
          limit: 1,
        },
        headers: adminToken
          ? { Authorization: `Bearer ${adminToken}` }
          : token
            ? { Authorization: `Bearer ${token}` }
            : {},
      });
      const roles = response.data.data;
      console.log('[getRoleIdByName] Roles encontrados (exact):', roles?.map?.((r) => r.name) || roles);
      if (roles && roles.length > 0) {
        return roles[0].id;
      }
    }

    // 2) Búsqueda flexible (case-insensitive, sin tildes, incluye sinónimos)
    const allRes = await directusClient.get<DirectusResponse<DirectusRole[]>>('/roles', {
      params: { fields: ['id', 'name'], limit: -1 },
      headers: adminToken
        ? { Authorization: `Bearer ${adminToken}` }
        : token
          ? { Authorization: `Bearer ${token}` }
          : {},
    });
    const all = allRes.data.data || [];
    if (all.length === 0) {
      console.warn('[users-api] Lista de roles vacía o inaccesible. Verifica token y permisos.');
    } else {
      console.log('[getRoleIdByName] Roles disponibles:', all.map((r) => r.name).join(', '));
    }
    const normalize = (s: string) =>
      s
        ?.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    const target = normalize(name);
    const synonyms: Record<string, string[]> = {
      cliente: ['cliente', 'client', 'customer', 'portal cliente', 'portal-client', 'cliente portal'],
      vendedor: ['vendedor', 'seller', 'sales', 'salesperson'],
      administrator: ['administrator', 'admin'],
    };
    const bucket = synonyms[target || ''] || [name];
    const foundFlexible =
      all.find((r) => normalize(r.name) === target) ||
      all.find((r) => bucket.includes(normalize(r.name) || '')) ||
      all.find((r) => (normalize(r.name) || '').includes(target || ''));
    if (foundFlexible) {
      return foundFlexible.id;
    }

    // 3) Fallback por variable de entorno
    const envKey = `NEXT_PUBLIC_DIRECTUS_ROLE_${(name || '').toUpperCase().replace(/\s+/g, '_')}_ID`;
    const envVal =
      // Específicos por si existen
      (name?.toLowerCase() === 'cliente' && process.env.NEXT_PUBLIC_DIRECTUS_ROLE_CLIENTE_ID) ||
      (name?.toLowerCase() === 'vendedor' && process.env.NEXT_PUBLIC_DIRECTUS_ROLE_VENDEDOR_ID) ||
      (process.env as any)[envKey];
    if (envVal && String(envVal).length > 0) {
      return String(envVal);
    }

    throw new Error(`No se encontró el rol "${name}" en Directus`);
  } catch (error) {
    handleAxiosError(error, 'getRoleIdByName');
  }
}

export async function createUserCliente(
  email: string,
  password: string,
  token?: string,
): Promise<DirectusUser> {
  try {
    const roleId = await getRoleIdByName('Cliente', token);
    const adminToken = process.env.DIRECTUS_STATIC_TOKEN || process.env.NEXT_PUBLIC_DIRECTUS_STATIC_TOKEN;
    const response = await directusClient.post<DirectusResponse<DirectusUser>>(
      '/users',
      {
        email,
        password,
        role: roleId,
        status: 'active',
      },
      {
        // Forzar Static Token si está disponible para tener permisos suficientes
        headers: adminToken
          ? { Authorization: `Bearer ${adminToken}` }
          : token
            ? { Authorization: `Bearer ${token}` }
            : {},
      },
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'createUserCliente');
  }
}

export async function createUserVendedor(
  email: string,
  password: string,
  token?: string,
): Promise<DirectusUser> {
  try {
    const roleId = await getRoleIdByName('Vendedor', token);
    const adminToken = process.env.DIRECTUS_STATIC_TOKEN || process.env.NEXT_PUBLIC_DIRECTUS_STATIC_TOKEN;
    const response = await directusClient.post<DirectusResponse<DirectusUser>>(
      '/users',
      {
        email,
        password,
        role: roleId,
        status: 'active',
      },
      {
        headers: adminToken
          ? { Authorization: `Bearer ${adminToken}` }
          : token
            ? { Authorization: `Bearer ${token}` }
            : {},
      },
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'createUserVendedor');
  }
}

export async function deleteUser(userId: string, token?: string): Promise<void> {
  try {
    const adminToken = process.env.NEXT_PUBLIC_DIRECTUS_STATIC_TOKEN;
    await directusClient.delete(`/users/${userId}`, {
      headers: adminToken
        ? { Authorization: `Bearer ${adminToken}` }
        : token
          ? { Authorization: `Bearer ${token}` }
          : {},
    });
  } catch (error) {
    handleAxiosError(error, 'deleteUser');
  }
}

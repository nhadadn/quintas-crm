import 'server-only';
import { NextResponse } from 'next/server';
import axios from 'axios';

const DIRECTUS_URL =
  process.env.DIRECTUS_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_DIRECTUS_URL ||
  'http://localhost:8055';

export async function POST(req: Request) {
  try {
    // Extraer token de sesión desde cookie o header Authorization
    const cookieHeader = req.headers.get('cookie') || '';
    let sessionToken: string | null = null;
    // Buscar cookie 'directus_access_token'
    const cookieParts = cookieHeader.split(';').map((p) => p.trim());
    for (const p of cookieParts) {
      if (p.toLowerCase().startsWith('directus_access_token=')) {
        sessionToken = p.substring('directus_access_token='.length);
        break;
      }
    }
    if (!sessionToken) {
      const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
      const m = auth.match(/^Bearer\s+(.+)$/i);
      if (m) sessionToken = m[1];
    }
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'No se encontró sesión de Directus activa' },
        { status: 401 },
      );
    }
    console.log('[crear-cliente][DEBUG] Usando Session Token (prefijo):', sessionToken.substring(0, 5));
    const body = await req.json();
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '').trim();
    const clienteId = String(body?.clienteId || '').trim();

    if (!email || !password || !clienteId) {
      console.error('[crear-cliente] Faltan parámetros requeridos', { email: !!email, password: !!password, clienteId: !!clienteId });
      return NextResponse.json({ success: false, error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const headers = {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    } as const;

    // DEBUG de cabeceras y URL antes de la primera llamada
    console.log('[crear-cliente][DEBUG] --- INICIO PETICIÓN ---');
    console.log('[crear-cliente][DEBUG] URL:', `${DIRECTUS_URL}/roles`);
    console.log('[crear-cliente][DEBUG] Header Authorization:', `Bearer ${sessionToken.substring(0, 5)}...`);

    // 1) Obtener rol "Cliente"
    let roleId: string | null = null;
    try {
      const r = await axios.get(`${DIRECTUS_URL}/roles`, {
        headers,
        params: { 'filter[name][_eq]': 'Cliente', fields: 'id,name', limit: 1 },
      });
      const rows = Array.isArray(r.data?.data) ? r.data.data : [];
      if (rows.length > 0) roleId = rows[0].id;
    } catch (err) {
      // No hacer fallback si 401: lanzar para capturar error real de Directus
      throw err;
    }
    if (!roleId) {
      const all = await axios.get(`${DIRECTUS_URL}/roles`, { headers, params: { fields: 'id,name', limit: -1 } });
      const rows = Array.isArray(all.data?.data) ? all.data.data : [];
      const roleNames = rows.map((rr: any) => rr?.name).filter(Boolean);
      console.log('[crear-cliente][DEBUG] Roles visibles para este usuario:', roleNames);
      const exact = rows.find((rr: any) => rr?.name === 'Cliente');
      if (exact?.id) {
        roleId = exact.id;
      } else {
        console.error('[crear-cliente] No se encontró rol "Cliente". Roles disponibles:', roleNames);
        return NextResponse.json(
          { success: false, error: 'No se encontró el rol "Cliente" en Directus', visibleRoles: roleNames },
          { status: 500 },
        );
      }
    }

    // 2) Usuario por email (duplicado)
    const exist = await axios.get(`${DIRECTUS_URL}/users`, {
      headers,
      params: { 'filter[email][_eq]': email, fields: 'id,email,role', limit: 1 },
    });
    const existing = Array.isArray(exist.data?.data) ? exist.data.data[0] : null;

    // 3) Crear usuario si no existe
    let userId: string;
    if (existing) {
      userId = existing.id;
    } else {
      const create = await axios.post(
        `${DIRECTUS_URL}/users`,
        { email, password, role: roleId, status: 'active' },
        { headers },
      );
      userId = create.data?.data?.id;
    }

    // 4) Patch cliente.user_id
    await axios.patch(
      `${DIRECTUS_URL}/items/clientes/${clienteId}`,
      { user_id: userId },
      { headers },
    );

    return NextResponse.json({ success: true, userId }, { status: 200 });
  } catch (e: any) {
    console.error('[crear-cliente] Error al crear/enlazar usuario Cliente:', e);
    if (e?.response?.data) {
      try {
        console.error('[crear-cliente] Error Directus data:', JSON.stringify(e.response.data, null, 2));
      } catch {}
    }
    const msg =
      e?.response?.data?.errors?.[0]?.message ||
      e?.message ||
      'Error creando/enlazando usuario';
    const details = e?.response?.data ?? null;
    return NextResponse.json({ success: false, error: msg, details }, { status: 500 });
  }
}

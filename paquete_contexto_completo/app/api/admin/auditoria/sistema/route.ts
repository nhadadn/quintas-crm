import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { directusClient } from '@/lib/directus-api';

async function ping(url: string) {
  try {
    const r = await fetch(`${url}/server/health`);
    const ok = r.ok;
    return { ok, status: r.status };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}

async function tryRead(url: string, token: string) {
  try {
    const r = await fetch(`${url}/items/lotes?limit=1&fields=id`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return { ok: r.ok, status: r.status };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}

async function getRoles(headers: any) {
  const r = await directusClient.get('/roles', { headers, params: { fields: 'id,name' } });
  return r.data?.data || [];
}

async function getPermissions(roleId: string, collection: string, action: string, headers: any) {
  const r = await directusClient.get('/permissions', {
    headers,
    params: {
      'filter[role][_eq]': roleId,
      'filter[collection][_eq]': collection,
      'filter[action][_eq]': action,
      limit: -1,
    },
  });
  return r.data?.data || [];
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const isAdmin = session.user?.role === 'Administrator' || session.user?.role === 'SuperAdmin';
  const headers = { Authorization: `Bearer ${session.accessToken}` } as any;
  const directusUrl =
    process.env.DIRECTUS_INTERNAL_URL ||
    process.env.DIRECTUS_URL ||
    process.env.NEXT_PUBLIC_DIRECTUS_URL ||
    '';

  const env = {
    NEXT_PUBLIC_DIRECTUS_URL: process.env.NEXT_PUBLIC_DIRECTUS_URL || null,
    DIRECTUS_URL: process.env.DIRECTUS_URL || null,
    DIRECTUS_INTERNAL_URL: process.env.DIRECTUS_INTERNAL_URL || null,
    ENABLE_MOCK_AUTH: process.env.ENABLE_MOCK_AUTH || 'false',
    NEXT_PUBLIC_USE_MOCK_API: process.env.NEXT_PUBLIC_USE_MOCK_API || 'false',
    NEXT_PUBLIC_USE_PAGOS_ENDPOINT: process.env.NEXT_PUBLIC_USE_PAGOS_ENDPOINT || 'false',
  } as any;
  const env_ok =
    !!env.NEXT_PUBLIC_DIRECTUS_URL &&
    !String(env.NEXT_PUBLIC_DIRECTUS_URL).includes('localhost') &&
    env.ENABLE_MOCK_AUTH !== 'true' &&
    env.NEXT_PUBLIC_USE_MOCK_API !== 'true';

  const health = directusUrl ? await ping(directusUrl) : { ok: false, error: 'no_url' };
  const readCheck =
    directusUrl && session.accessToken
      ? await tryRead(directusUrl, session.accessToken)
      : { ok: false, error: 'no_token_or_url' };

  let roles: any[] = [];
  let perms: any[] = [];
  try {
    roles = await getRoles(headers);
    const roleMap: Record<string, string> = {};
    for (const r of roles) roleMap[r.name] = r.id;
    const checks = [
      { r: roleMap['Administrator'], c: 'lotes', a: 'read' },
      { r: roleMap['Vendedor'], c: 'lotes', a: 'read' },
      { r: roleMap['Administrator'], c: 'pagos', a: 'update' },
      { r: roleMap['Administrator'], c: 'ventas', a: 'read' },
    ];
    for (const k of checks) {
      if (!k.r) continue;
      const p = await getPermissions(k.r, k.c, k.a, headers);
      perms.push({ role: k.r, collection: k.c, action: k.a, count: p.length });
    }
  } catch (e) {}

  let mockRoutes = { pagos: 0, clientes: 0 } as any;
  try {
    const base = new URL(req.url);
    const pagos = await fetch(`${base.origin}/api/pagos`);
    mockRoutes.pagos = pagos.status;
  } catch {}
  try {
    const base = new URL(req.url);
    const clientes = await fetch(`${base.origin}/api/clientes`);
    mockRoutes.clientes = clientes.status;
  } catch {}

  const extPagosProbe = directusUrl
    ? await (async () => {
        try {
          const r = await fetch(`${directusUrl}/pagos`, { method: 'GET' });
          return { ok: r.ok, status: r.status };
        } catch (e: any) {
          return { ok: false, error: e?.message };
        }
      })()
    : { ok: false };

  return NextResponse.json({
    auth_role: session.user?.role || null,
    is_admin: isAdmin,
    env: { ...env, env_ok },
    directus: { health, readCheck },
    roles_count: roles.length,
    perms,
    mockRoutes,
    pagos_extension_probe: extPagosProbe,
  });
}

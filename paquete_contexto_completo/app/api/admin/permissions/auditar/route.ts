import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { directusClient } from '@/lib/directus-api';

async function getRoleIdByName(name: string, headers: any) {
  const res = await directusClient.get('/roles', {
    params: { 'filter[name][_eq]': name, fields: 'id,name' },
    headers,
  });
  return res.data?.data?.[0]?.id as string | undefined;
}

async function getPermissions(roleId: string, collection: string, action: string, headers: any) {
  const res = await directusClient.get('/permissions', {
    params: {
      'filter[role][_eq]': roleId,
      'filter[collection][_eq]': collection,
      'filter[action][_eq]': action,
      limit: -1,
    },
    headers,
  });
  return res.data?.data || [];
}

function ensureFields(current: any, required: string[]): { changed: boolean; fields: any } {
  if (!current) return { changed: false, fields: current };
  const f = current.fields;
  if (f === '*' || f === null || f === undefined) return { changed: false, fields: f };
  if (Array.isArray(f)) {
    const set = new Set<string>(f);
    let changed = false;
    for (const r of required)
      if (!set.has(r)) {
        set.add(r);
        changed = true;
      }
    return { changed, fields: Array.from(set) };
  }
  return { changed: false, fields: f };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (
    !session?.accessToken ||
    (session.user?.role !== 'Administrator' && session.user?.role !== 'SuperAdmin')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const headers = { Authorization: `Bearer ${session.accessToken}` } as any;
  const out: any = { env: {}, checks: [] };
  out.env.NEXT_PUBLIC_DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || null;
  out.env.DIRECTUS_URL = process.env.DIRECTUS_URL || null;
  out.env.DIRECTUS_INTERNAL_URL = process.env.DIRECTUS_INTERNAL_URL || null;
  out.env.ENABLE_MOCK_AUTH = process.env.ENABLE_MOCK_AUTH || 'false';
  out.env.USE_PAGOS_ENDPOINT = process.env.NEXT_PUBLIC_USE_PAGOS_ENDPOINT || 'false';
  out.env.env_ok =
    !!out.env.NEXT_PUBLIC_DIRECTUS_URL &&
    !String(out.env.NEXT_PUBLIC_DIRECTUS_URL).includes('localhost') &&
    out.env.ENABLE_MOCK_AUTH !== 'true';

  try {
    const adminId = await getRoleIdByName('Administrator', headers);
    const vendedorId = await getRoleIdByName('Vendedor', headers);

    const tasks: Array<{
      roleId?: string;
      collection: string;
      action: string;
      required: string[];
    }> = [
      {
        roleId: adminId,
        collection: 'lotes',
        action: 'read',
        required: ['precio_total', 'estatus'],
      },
      {
        roleId: vendedorId,
        collection: 'lotes',
        action: 'read',
        required: ['precio_total', 'estatus'],
      },
      {
        roleId: adminId,
        collection: 'pagos',
        action: 'update',
        required: ['monto_pagado', 'estatus', 'fecha_pago', 'metodo_pago', 'referencia', 'notas'],
      },
    ];

    for (const t of tasks) {
      if (!t.roleId) {
        out.checks.push({
          collection: t.collection,
          action: t.action,
          status: 'skipped',
          reason: 'role_not_found',
        });
        continue;
      }
      const perms = await getPermissions(t.roleId, t.collection, t.action, headers);
      if (!perms || perms.length === 0) {
        out.checks.push({
          roleId: t.roleId,
          collection: t.collection,
          action: t.action,
          status: 'manual_review_required',
          reason: 'no_permission_record',
        });
        continue;
      }
      for (const p of perms) {
        const { changed, fields } = ensureFields(p, t.required);
        if (changed) {
          await directusClient.patch(`/permissions/${p.id}`, { fields }, { headers });
          out.checks.push({
            permission_id: p.id,
            collection: t.collection,
            action: t.action,
            status: 'patched',
            fields,
          });
        } else {
          out.checks.push({
            permission_id: p.id,
            collection: t.collection,
            action: t.action,
            status: 'ok',
          });
        }
      }
    }

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json(
      { error: 'audit_failed', details: e?.response?.data || e?.message },
      { status: 500 },
    );
  }
}

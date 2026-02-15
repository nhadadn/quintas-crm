import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { directusClient } from '@/lib/directus-api';

async function getField(collection: string, field: string, headers: any) {
  const r = await directusClient.get(`/fields/${collection}`, {
    headers,
    params: { 'filter[field][_eq]': field, limit: 1 },
  });
  return r.data?.data?.[0];
}

async function createDecimalField(collection: string, field: string, headers: any) {
  const payload = {
    collection,
    field,
    type: 'decimal',
    precision: 14,
    scale: 2,
    meta: {
      interface: 'input',
      special: null,
      display: 'formatted-decimal',
      options: { decimals: 2 },
    },
  } as any;
  const r = await directusClient.post(`/fields/${collection}`, payload, { headers });
  return r.data;
}

async function backfillPrecioTotal(headers: any) {
  // Estrategia simple: si precio_total es null/0 y existe precio_lista, usar precio_lista
  // Se hace en lotes con batches para seguridad.
  const batch = 100;
  let page = 1;
  let totalUpdated = 0;
  while (true) {
    const list = await directusClient.get('/items/lotes', {
      headers,
      params: {
        page,
        limit: batch,
        fields: 'id,precio_total,precio_lista',
      },
    });
    const items = list.data?.data || [];
    if (!items.length) break;
    for (const it of items) {
      const pt = Number(it.precio_total || 0);
      const pl = Number(it.precio_lista || 0);
      if ((!pt || pt === 0) && pl && pl > 0) {
        await directusClient.patch(`/items/lotes/${it.id}`, { precio_total: pl }, { headers });
        totalUpdated++;
      }
    }
    page++;
  }
  return totalUpdated;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const headers = { Authorization: `Bearer ${session.accessToken}` } as any;

  try {
    const exists = await getField('lotes', 'precio_total', headers);
    let created: any = null;
    if (!exists) {
      created = await createDecimalField('lotes', 'precio_total', headers);
    }

    const params = new URL(req.url).searchParams;
    const doBackfill = params.get('backfill') === 'true';
    let updated = 0;
    if (doBackfill) {
      updated = await backfillPrecioTotal(headers);
    }

    return NextResponse.json({
      field_existed: !!exists,
      field_created: !!created,
      backfill_updated: updated,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'ensure_failed', details: e?.response?.data || e?.message },
      { status: 500 },
    );
  }
}

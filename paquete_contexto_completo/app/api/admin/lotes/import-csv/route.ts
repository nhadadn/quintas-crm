import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { directusClient } from '@/lib/directus-api';

function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [] as any[];
  const headers = splitRow(lines[0]);
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitRow(lines[i]);
    const obj: any = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = cols[j] ?? '';
    }
    rows.push(obj);
  }
  return rows;
}

function splitRow(row: string) {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === '"') {
      if (q && row[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        q = !q;
      }
    } else if (c === ',' && !q) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toTyped(obj: any) {
  const out: any = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === '' || v === null || v === undefined) {
      out[k] = v;
      continue;
    }
    if (
      /^(precio|monto|area|superficie|ancho|largo|id|_id)$/i.test(k) ||
      /(_id|_total)$/i.test(k)
    ) {
      const n = Number(v);
      out[k] = Number.isFinite(n) ? n : v;
    } else if (/^(true|false)$/i.test(String(v))) {
      out[k] = String(v).toLowerCase() === 'true';
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function chunkedCreate(items: any[], headers: any) {
  const size = 100;
  const results: any[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const r = await directusClient.post('/items/lotes', batch, { headers });
    results.push(r.data?.data || []);
  }
  return results.flat();
}

async function chunkedPatch(items: any[], idField: string, headers: any) {
  const out: any[] = [];
  for (const it of items) {
    const id = it[idField];
    if (id === undefined || id === null) continue;
    const copy = { ...it };
    delete copy[idField];
    const r = await directusClient.patch(`/items/lotes/${id}`, copy, { headers });
    out.push(r.data?.data);
  }
  return out;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const isAdmin =
    session.user?.role === 'Administrator' ||
    session.user?.role === 'Vendedor' ||
    session.user?.role === 'SuperAdmin';
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const contentType = req.headers.get('content-type') || '';
  let rows: any[] = [];
  if (contentType.includes('text/csv')) {
    const text = await req.text();
    rows = parseCSV(text).map(toTyped);
  } else if (contentType.includes('application/json')) {
    const body = await req.json();
    const csv = body.csv as string | undefined;
    const data = body.data as any[] | undefined;
    if (csv) rows = parseCSV(csv).map(toTyped);
    else if (Array.isArray(data)) rows = data.map(toTyped);
  } else {
    return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 415 });
  }

  if (!rows.length) return NextResponse.json({ error: 'Empty dataset' }, { status: 400 });

  const mode = (new URL(req.url).searchParams.get('mode') || 'create').toLowerCase();
  const idField = new URL(req.url).searchParams.get('idField') || 'id';
  const headers = { Authorization: `Bearer ${session.accessToken}` } as any;

  if (mode === 'update') {
    const updated = await chunkedPatch(rows, idField, headers);
    return NextResponse.json({ updated: updated.length });
  }

  const created = await chunkedCreate(rows, headers);
  return NextResponse.json({ created: created.length });
}

// Simple batch reprocess for ventas with post_process_status in ['error','pending']
const BASE_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const EMAIL = process.env.DIRECTUS_EMAIL || 'admin@quintas.com';
const PASSWORD = process.env.DIRECTUS_PASSWORD || 'admin_quintas_2024';

async function login() {
  const r = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Login failed: ${r.status} ${t}`);
  }
  const j = await r.json();
  const token = j?.data?.access_token;
  if (!token) throw new Error(`No access_token in login response`);
  return token;
}

async function fetchVentas(token) {
  const headers = { Authorization: `Bearer ${token}` };
  const url = `${BASE_URL}/items/ventas?fields=id,post_process_status&limit=-1&filter[post_process_status][_in]=error,pending`;
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`Fetch ventas failed: ${r.status}`);
  const j = await r.json();
  return j?.data || [];
}

async function reprocessVenta(token, id) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  // Fetch venta
  const vRes = await fetch(`${BASE_URL}/items/ventas/${id}?fields=id,monto_total,vendedor_id`, { headers });
  if (!vRes.ok) return { ok: false, status: vRes.status, text: await vRes.text().catch(() => '') };
  const venta = (await vRes.json()).data;
  // Resolve vendedor
  let vendedor = null;
  if (venta.vendedor_id) {
    const venRes = await fetch(`${BASE_URL}/items/vendedores/${venta.vendedor_id}`, { headers });
    vendedor = venRes.ok ? (await venRes.json()).data : null;
  } else {
    const venRes = await fetch(`${BASE_URL}/items/vendedores?limit=1`, { headers });
    const list = venRes.ok ? (await venRes.json()).data : [];
    vendedor = list && list[0] ? list[0] : null;
  }
  const esquema = String(vendedor?.comision_esquema || 'porcentaje').toLowerCase();
  const commissionRate = vendedor?.comision_porcentaje != null ? parseFloat(vendedor.comision_porcentaje) : 5.0;
  const comisionFija = vendedor?.comision_fija != null ? parseFloat(vendedor.comision_fija) : 0.0;
  // Build payload
  const milestones = [
    { name: 'Enganche', pct: 0.3 },
    { name: 'Contrato', pct: 0.3 },
    { name: 'Liquidación', pct: 0.4 },
  ];
  const montoVenta = parseFloat(venta.monto_total || 0);
  const payload = [];
  if (esquema === 'fijo') {
    payload.push({
      id: (globalThis.crypto?.randomUUID && crypto.randomUUID()) || (Math.random().toString(36).slice(2) + Date.now()),
      venta_id: venta.id,
      vendedor_id: vendedor?.id || venta.vendedor_id || null,
      tipo_comision: 'Comisión Fija',
      monto_venta: montoVenta,
      monto_comision: parseFloat(comisionFija.toFixed(2)),
      estatus: 'pendiente',
      fecha_pago_programada: new Date().toISOString().split('T')[0],
      notas: 'Reprocesado (script)',
      porcentaje_comision: 0.0,
      porcentaje: 0.0,
    });
  } else {
    for (const m of milestones) {
      const effectiveRate = commissionRate * m.pct;
      const amount = montoVenta * (effectiveRate / 100);
      const pr = parseFloat(effectiveRate.toFixed(2));
      payload.push({
        id: (globalThis.crypto?.randomUUID && crypto.randomUUID()) || (Math.random().toString(36).slice(2) + Date.now()),
        venta_id: venta.id,
        vendedor_id: vendedor?.id || venta.vendedor_id || null,
        tipo_comision: `Comisión ${m.name}`,
        monto_venta: montoVenta,
        monto_comision: parseFloat(amount.toFixed(2)),
        estatus: 'pendiente',
        fecha_pago_programada: new Date().toISOString().split('T')[0],
        notas: `Reprocesado (script) ${ (m.pct * 100).toFixed(0) }%`,
        porcentaje_comision: pr,
        porcentaje: pr,
      });
    }
    if (esquema === 'mixto' && comisionFija > 0) {
      payload.push({
        id: (globalThis.crypto?.randomUUID && crypto.randomUUID()) || (Math.random().toString(36).slice(2) + Date.now()),
        venta_id: venta.id,
        vendedor_id: vendedor?.id || venta.vendedor_id || null,
        tipo_comision: 'Comisión Fija',
        monto_venta: montoVenta,
        monto_comision: parseFloat(comisionFija.toFixed(2)),
        estatus: 'pendiente',
        fecha_pago_programada: new Date().toISOString().split('T')[0],
        notas: 'Reprocesado (script) mixto',
        porcentaje_comision: 0.0,
        porcentaje: 0.0,
      });
    }
  }
  if (payload.length === 0) return { ok: false, status: 400, text: 'No payload' };
  // List existing comisiones
  const existingRes = await fetch(`${BASE_URL}/items/comisiones?limit=-1&fields=id&filter[venta_id][_eq]=${id}`, { headers });
  let ids = [];
  if (existingRes.ok) {
    const ej = await existingRes.json();
    ids = (ej?.data || []).map((x) => x.id);
  }
  // Delete existing
  if (ids.length > 0) {
    await fetch(`${BASE_URL}/items/comisiones`, { method: 'DELETE', headers, body: JSON.stringify({ keys: ids }) });
  }
  // Create many
  const createRes = await fetch(`${BASE_URL}/items/comisiones`, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!createRes.ok) return { ok: false, status: createRes.status, text: await createRes.text().catch(() => '') };
  // Update venta status
  await fetch(`${BASE_URL}/items/ventas/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ post_process_status: 'ok', post_process_error: null }),
  });
  return { ok: true, status: 201, text: await createRes.text().catch(() => '') };
}

async function main() {
  try {
    const token = await login();
    const ventas = await fetchVentas(token);
    console.log(`Ventas a reprocesar: ${ventas.length}`);
    let ok = 0, fail = 0;
    for (const it of ventas) {
      const res = await reprocessVenta(token, it.id);
      if (res.ok) {
        ok++;
        console.log(`[OK] ${it.id} → ${res.text}`);
      } else {
        fail++;
        console.log(`[ERR] ${it.id} → ${res.status} ${res.text}`);
      }
    }
    console.log(`Resumen: ok=${ok}, error=${fail}`);
    // Verify post status of processed ids
    if (ventas.length > 0) {
      const headers = { Authorization: `Bearer ${token}` };
      const ids = ventas.map((v) => v.id).join(',');
      const verify = await fetch(`${BASE_URL}/items/ventas?fields=id,post_process_status&limit=-1&filter[id][_in]=${ids}`, { headers });
      const vj = await verify.json().catch(() => ({}));
      console.log(`Verificación estados: ${JSON.stringify(vj)}`);
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();


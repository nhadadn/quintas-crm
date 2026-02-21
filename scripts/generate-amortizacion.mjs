import { randomUUID } from 'node:crypto';

const BASE_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const EMAIL = process.env.DIRECTUS_EMAIL || 'admin@quintas.com';
const PASSWORD = process.env.DIRECTUS_PASSWORD || 'admin_quintas_2024';
const ID_PREFIX = process.env.TARGET_VENTA_PREFIX || '91464eaf';

async function login() {
  const r = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const j = await r.json();
  const token = j?.data?.access_token;
  if (!token) throw new Error(`Login failed: ${JSON.stringify(j)}`);
  return token;
}

async function fetchVenta(token) {
  const headers = { Authorization: `Bearer ${token}` };
  const r = await fetch(`${BASE_URL}/items/ventas?fields=id,monto_total,enganche,plazo_meses,tasa_interes,fecha_venta&limit=-1`, { headers });
  const j = await r.json();
  const items = j?.data || [];
  const v = items.find((x) => String(x.id).startsWith(ID_PREFIX));
  if (!v) throw new Error(`Venta con prefijo ${ID_PREFIX} no encontrada`);
  return v;
}

function buildTabla(venta) {
  const principal = parseFloat(venta.monto_total || 0) - parseFloat(venta.enganche || 0);
  const months = parseInt(venta.plazo_meses || 0);
  const annualRate = parseFloat(venta.tasa_interes || 0);
  const monthlyRate = annualRate / 100 / 12;
  const startDate = new Date(venta.fecha_venta || new Date());
  let monthlyPayment = 0;
  if (monthlyRate <= 0) {
    monthlyPayment = principal / months;
  } else {
    monthlyPayment =
      (principal * (monthlyRate * Math.pow(1 + monthlyRate, months))) /
      (Math.pow(1 + monthlyRate, months) - 1);
  }
  const tabla = [];
  let balance = principal;
  for (let i = 1; i <= months; i++) {
    const interest = balance * monthlyRate;
    let capital = monthlyPayment - interest;
    if (i === months) capital = balance;
    const saldoFinal = balance - capital;
    const payDate = new Date(startDate);
    payDate.setMonth(startDate.getMonth() + i);
    tabla.push({
      id: randomUUID(),
      venta_id: venta.id,
      numero_pago: i,
      fecha_vencimiento: payDate.toISOString().split('T')[0],
      monto_cuota: (capital + interest).toFixed(2),
      interes: interest.toFixed(2),
      capital: capital.toFixed(2),
      saldo_inicial: balance.toFixed(2),
      saldo_final: (saldoFinal < 0.01 ? 0 : saldoFinal).toFixed(2),
      estatus: 'pendiente',
      monto_pagado: 0,
    });
    balance = saldoFinal;
  }
  return tabla;
}

async function writeTabla(token, ventaId, tabla) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  // Delete existing
  const existing = await fetch(`${BASE_URL}/items/amortizacion?fields=id&limit=-1&filter[venta_id][_eq]=${ventaId}`, { headers: { Authorization: `Bearer ${token}` } });
  const ej = await existing.json();
  const ids = (ej?.data || []).map((x) => x.id);
  if (ids.length > 0) {
    await fetch(`${BASE_URL}/items/amortizacion`, { method: 'DELETE', headers, body: JSON.stringify({ keys: ids }) });
  }
  const r = await fetch(`${BASE_URL}/items/amortizacion`, { method: 'POST', headers, body: JSON.stringify(tabla) });
  if (!r.ok) throw new Error(`Error creando amortización: ${r.status} ${await r.text()}`);
  return r.json();
}

async function main() {
  const token = await login();
  const venta = await fetchVenta(token);
  const tabla = buildTabla(venta);
  const res = await writeTabla(token, venta.id, tabla);
  console.log(`Generadas ${tabla.length} cuotas para venta ${venta.id}`);
  console.log(JSON.stringify(res));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


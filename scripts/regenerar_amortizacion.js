const BASE_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const EMAIL = process.env.DIRECTUS_EMAIL || 'admin@quintas.com';
const PASSWORD = process.env.DIRECTUS_PASSWORD || 'admin_quintas_2024';

if (typeof fetch !== 'function') {
  console.error('fetch no está disponible en este entorno de Node. Usa Node 18+ o configura un polyfill.');
  process.exit(1);
}

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

async function fetchVenta(token, ventaId) {
  const headers = { Authorization: `Bearer ${token}` };
  const r = await fetch(
    `${BASE_URL}/items/ventas/${ventaId}?fields=id,monto_total,enganche,plazo_meses,tasa_interes,fecha_inicio,fecha_venta,monto_financiado`,
    { headers }
  );
  const j = await r.json();
  if (!j || !j.data) {
    throw new Error(`Venta ${ventaId} no encontrada: ${JSON.stringify(j)}`);
  }
  return j.data;
}

async function deleteAmortizacion(token, ventaId) {
  const headers = { Authorization: `Bearer ${token}` };
  const r = await fetch(
    `${BASE_URL}/items/amortizacion?fields=id&limit=-1&filter[venta_id][_eq]=${ventaId}`,
    { headers }
  );
  const j = await r.json();
  const rows = (j && j.data) || [];
  const ids = rows.map((x) => x.id);
  if (ids.length === 0) {
    console.log(`No existen filas previas de amortizacion para venta ${ventaId}`);
    return 0;
  }
  const delRes = await fetch(`${BASE_URL}/items/amortizacion`, {
    method: 'DELETE',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys: ids }),
  });
  if (!delRes.ok) {
    throw new Error(`Error borrando amortizacion: ${delRes.status} ${await delRes.text()}`);
  }
  console.log(`Borradas ${ids.length} filas previas de amortizacion para venta ${ventaId}`);
  return ids.length;
}

function round2(x) {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function buildTabla(venta) {
  const principal = parseFloat(venta.monto_total || 0) - parseFloat(venta.enganche || 0);
  const months = parseInt(venta.plazo_meses || 0);
  const annualRate = parseFloat(venta.tasa_interes || 0);
  const monthlyRate = annualRate / 100 / 12;
  const startDate = new Date(venta.fecha_inicio || venta.fecha_venta || new Date());

  if (!months || principal <= 0) return [];

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
  const totalObjetivo = round2(monthlyPayment * months);
  let sumaCuotasPrevias = 0;

  for (let i = 1; i <= months; i++) {
    const interestRaw = balance * monthlyRate;
    let interest = interestRaw;
    let capital = monthlyPayment - interestRaw;

    let cuota = 0;
    if (i < months) {
      cuota = round2(capital + interest);
      sumaCuotasPrevias += cuota;
    } else {
      cuota = round2(totalObjetivo - sumaCuotasPrevias);
      const interestRounded = round2(interestRaw);
      let capitalRounded = round2(cuota - interestRounded);
      if (capitalRounded > round2(balance)) {
        capitalRounded = round2(balance);
      }
      capital = capitalRounded;
      interest = round2(cuota - capitalRounded);
    }

    const saldoFinal = balance - capital;
    const payDate = addMonths(startDate, i).toISOString().split('T')[0];

    tabla.push({
      venta_id: venta.id,
      numero_pago: i,
      fecha_vencimiento: payDate,
      monto_cuota: (i < months ? cuota : round2(capital + interest)).toFixed(2),
      interes: round2(interest).toFixed(2),
      capital: round2(capital).toFixed(2),
      saldo_inicial: round2(balance).toFixed(2),
      saldo_final: (saldoFinal < 0.01 ? 0 : round2(saldoFinal)).toFixed(2),
      estatus: 'pendiente',
      monto_pagado: 0,
    });

    balance = saldoFinal;
  }

  return tabla;
}

async function writeTabla(token, ventaId, tabla) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  await deleteAmortizacion(token, ventaId);

  if (tabla.length === 0) {
    console.log('Tabla vacía; no se insertan filas.');
    return 0;
  }

  const r = await fetch(`${BASE_URL}/items/amortizacion`, {
    method: 'POST',
    headers,
    body: JSON.stringify(tabla),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Error creando amortizacion: ${r.status} ${txt}`);
  }
  return tabla.length;
}

async function contarAmortizacion(token, ventaId) {
  const headers = { Authorization: `Bearer ${token}` };
  const r = await fetch(
    `${BASE_URL}/items/amortizacion?fields=id&limit=-1&filter[venta_id][_eq]=${ventaId}`,
    { headers }
  );
  const j = await r.json();
  const rows = (j && j.data) || [];
  return rows.length;
}

async function main() {
  const ventaId = process.argv[2];
  if (!ventaId) {
    console.error('Uso: node scripts/regenerar_amortizacion.js <ventaId>');
    process.exit(1);
  }

  console.log(`Regenerando amortizacion para venta ${ventaId} en ${BASE_URL}`);

  const token = await login();
  const venta = await fetchVenta(token, ventaId);
  console.log(
    `Venta leida: id=${venta.id}, plazo_meses=${venta.plazo_meses}, monto_financiado=${venta.monto_financiado}, tasa_interes=${venta.tasa_interes}`
  );

  const tabla = buildTabla(venta);
  const creadas = await writeTabla(token, ventaId, tabla);

  const filas = await contarAmortizacion(token, ventaId);
  console.log(`Amortizacion regenerada: ${filas} filas para venta ${ventaId}`);

  const plazo = Number(venta.plazo_meses) || 0;
  if (plazo > 0 && filas !== plazo) {
    console.warn(
      `Advertencia: filas de amortizacion (${filas}) no coinciden con plazo_meses (${plazo})`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

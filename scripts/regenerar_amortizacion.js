const fetch = global.fetch || ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));

const BASE_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const EMAIL = process.env.DIRECTUS_EMAIL || 'admin@quintas.com';
const PASSWORD = process.env.DIRECTUS_PASSWORD || 'admin_quintas_2024';

async function login() {
  const r = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const j = await r.json();
  const token = j && j.data && j.data.access_token;
  if (!token) {
    throw new Error(`Login failed: ${JSON.stringify(j)}`);
  }
  return token;
}

async function fetchVenta(token, ventaId) {
  const headers = { Authorization: `Bearer ${token}` };
  const r = await fetch(
    `${BASE_URL}/items/ventas/${ventaId}?fields=*,*.*`,
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

async function triggerRegeneracion(token, ventaId) {
  const url = `${BASE_URL}/items/ventas`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const body = { id: ventaId };
  const r = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    throw new Error(`Error disparando hook de venta ${ventaId}: ${r.status} ${await r.text()}`);
  }
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

  await deleteAmortizacion(token, ventaId);
  await triggerRegeneracion(token, ventaId);

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

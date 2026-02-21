const mysql = require('mysql2/promise');
require('dotenv').config();

const USER_ID = process.env.DIRECTUS_FIX_USER_ID || '826fb73b-12bc-458c-9996-02f849fb770c';
const COLLECTIONS = ['v_dashboard_kpis', 'ventas', 'comisiones'];

async function loginDirectus() {
  const base = process.env.DIRECTUS_URL || 'http://127.0.0.1:8055';
  const email = process.env.DIRECTUS_ADMIN_EMAIL;
  const password = process.env.DIRECTUS_ADMIN_PASSWORD;
  if (!email || !password) return null;
  const r = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  const token = j?.data?.access_token;
  return token || null;
}

async function ensureCollectionViaApi(token) {
  const base = process.env.DIRECTUS_URL || 'http://127.0.0.1:8055';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const getRes = await fetch(`${base}/collections/v_dashboard_kpis`, { headers });
  if (getRes.ok) return true;
  const body = {
    collection: 'v_dashboard_kpis',
    meta: {
      icon: 'insights',
      note: 'Vista agregada para KPIs del Dashboard',
      hidden: false,
      singleton: false,
      accountability: 'all',
    },
  };
  const postRes = await fetch(`${base}/collections`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return postRes.ok;
}

async function ensurePrimaryKeyMeta(token) {
  const base = process.env.DIRECTUS_URL || 'http://127.0.0.1:8055';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const fRes = await fetch(`${base}/fields/v_dashboard_kpis/venta_id`, { headers });
  if (fRes.ok) {
    const data = await fRes.json();
    const special = data?.data?.special || [];
    if (Array.isArray(special) && special.includes('primary-key')) return true;
  }
  const upRes = await fetch(`${base}/fields/v_dashboard_kpis/venta_id`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ meta: { special: ['primary-key'] } }),
  });
  if (upRes.ok) return true;
  const crRes = await fetch(`${base}/fields/v_dashboard_kpis`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ field: 'venta_id', meta: { special: ['primary-key'] } }),
  });
  return crRes.ok;
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    multipleStatements: false,
  });

  try {
    const token = await loginDirectus();
    if (token) {
      await ensureCollectionViaApi(token);
      await ensurePrimaryKeyMeta(token);
    }
    if (!token) {
      try {
        const [exists] = await conn.query(
          `SELECT 1 FROM directus_collections WHERE collection='v_dashboard_kpis' LIMIT 1`
        );
        if (!exists || exists.length === 0) {
          try {
            await conn.query(
              `INSERT INTO directus_collections (collection, note) VALUES ('v_dashboard_kpis', 'Vista agregada para KPIs del Dashboard')`
            );
          } catch (err) {
            console.warn('Failed to insert v_dashboard_kpis with note', err);
          }
          try {
            await conn.query(
              `INSERT INTO directus_collections (collection, icon, note, hidden, singleton) VALUES ('v_dashboard_kpis', 'insights', 'Vista agregada para KPIs del Dashboard', 0, 0)`
            );
          } catch (err) {
            console.warn('Failed to insert v_dashboard_kpis with icon metadata', err);
          }
          try {
            await conn.query(
              `INSERT INTO directus_collections (collection) VALUES ('v_dashboard_kpis')`
            );
          } catch (err) {
            console.warn('Failed to insert minimal v_dashboard_kpis collection row', err);
          }
        }
      } catch (err) {
        console.warn('Failed to ensure v_dashboard_kpis collection presence', err);
      }
    }

    const [policyRows] = await conn.query(
      `SELECT u.email, r.name as role_name, p.id as policy_id, p.name as policy_name
       FROM directus_users u
       JOIN directus_roles r ON u.role = r.id
       JOIN directus_access a ON a.role = r.id
       JOIN directus_policies p ON p.id = a.policy
       WHERE u.id = ?`,
      [USER_ID]
    );
    if (!policyRows || policyRows.length === 0) return;

    for (const row of policyRows) {
      const policyId = row.policy_id;
      for (const collection of COLLECTIONS) {
        const [permRows] = await conn.query(
          `SELECT * FROM directus_permissions WHERE collection=? AND policy=?`,
          [collection, policyId]
        );
        if (!permRows || permRows.length === 0) {
          await conn.query(
            `INSERT INTO directus_permissions (policy, collection, action, permissions, validation, fields) VALUES (?, ?, 'read', '{}', '{}', '*')`,
            [policyId, collection]
          );
        } else {
          const needsUpdate = permRows.some(
            (p) =>
              p.action !== 'read' || p.fields !== '*' || (p.permissions && p.permissions !== '{}')
          );
          if (needsUpdate) {
            await conn.query(
              `UPDATE directus_permissions SET action='read', fields='*', permissions='{}', validation='{}' WHERE collection=? AND policy=?`,
              [collection, policyId]
            );
          }
        }
      }
    }

    for (const collection of COLLECTIONS) {
      await conn.query('SELECT 1 FROM directus_permissions WHERE collection=? LIMIT 1', [
        collection,
      ]);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await conn.end();
  }
}

main();

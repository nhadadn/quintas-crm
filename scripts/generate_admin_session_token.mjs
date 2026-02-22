import mysql from 'mysql2/promise';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { createHash } from 'crypto';

function makeToken() {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  return `quintas_admin_token_${ts}_real_${rand}`;
}

async function updateEnvLocal(token) {
  const envPath = path.resolve(process.cwd(), 'frontend', '.env.local');
  let content = '';
  try {
    content = fs.readFileSync(envPath, 'utf8');
  } catch {
    content = '';
  }
  if (content.includes('DIRECTUS_STATIC_TOKEN=')) {
    content = content.replace(/(^|\r?\n)DIRECTUS_STATIC_TOKEN=.*(?=\r?\n|$)/, `$1DIRECTUS_STATIC_TOKEN=${token}`);
  } else {
    content += (content.endsWith('\n') ? '' : '\n') + `DIRECTUS_STATIC_TOKEN=${token}\n`;
  }
  if (!/DIRECTUS_INTERNAL_URL=/.test(content)) {
    const url = process.env.DIRECTUS_INTERNAL_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
    content += `DIRECTUS_INTERNAL_URL=${url}\n`;
  }
  fs.writeFileSync(envPath, content, 'utf8');
  return envPath;
}

async function main() {
  const DIRECTUS_URL =
    process.env.DIRECTUS_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_DIRECTUS_URL ||
    'http://localhost:8055';

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
    port: Number(process.env.DB_PORT || 3306),
    multipleStatements: true,
  });

  let adminUserId = null;
  try {
    const [roleRows] = await conn.query(
      "SELECT id FROM directus_roles WHERE LOWER(name)='administrator' LIMIT 1",
    );
    const adminRoleId = roleRows?.[0]?.id;
    if (!adminRoleId) {
      console.error("❌ No se encontró el rol 'Administrator'");
      process.exit(1);
    }
    const [userRows] = await conn.query(
      'SELECT id FROM directus_users WHERE role = ? LIMIT 1',
      [adminRoleId],
    );
    adminUserId = userRows?.[0]?.id;
    if (!adminUserId) {
      console.error('❌ No se encontró un usuario con rol Administrator');
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Error obteniendo usuario admin:', e);
    process.exit(1);
  }

  const token = makeToken();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  let insertSQL = '';

  try {
    // Descubrir columnas disponibles en directus_sessions
    const [cols] = await conn.query(
      "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'directus_sessions'",
    );
    const available = new Set(cols.map((c) => c.COLUMN_NAME));
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10); // ~10 años
    const expiresStr = expires.toISOString().slice(0, 19).replace('T', ' ');
    const columns = [];
    const values = [];
    const params = [];
    if (available.has('token')) {
      columns.push('token');
      values.push('?');
      params.push(tokenHash);
    }
    if (available.has('user')) {
      columns.push('user');
      values.push('?');
      params.push(adminUserId);
    }
    if (available.has('expires')) {
      columns.push('expires');
      values.push('?');
      params.push(expiresStr);
    }
    if (available.has('ip')) {
      columns.push('ip');
      values.push('?');
      params.push('127.0.0.1');
    }
    if (available.has('user_agent')) {
      columns.push('user_agent');
      values.push('?');
      params.push('static-token');
    }
    if (available.has('origin')) {
      columns.push('origin');
      values.push('?');
      params.push('static');
    }
    if (available.has('revoked')) {
      columns.push('revoked');
      values.push('?');
      params.push(0);
    }
    insertSQL = `INSERT INTO directus_sessions (${columns.join(', ')}) VALUES (${values.join(', ')})`;
    await conn.query(insertSQL, params);
    console.log('✅ Token insertado en directus_sessions');
  } catch (e) {
    console.error('❌ Error insertando token en directus_sessions:', e);
    // Intentar tablas alternativas de tokens (según versión)
    try {
      const [tables] = await conn.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('directus_users_tokens','directus_access_tokens')",
      );
      const names = tables.map((t) => t.TABLE_NAME);
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10); // ~10 años
      const expiresStr = expires.toISOString().slice(0, 19).replace('T', ' ');
      if (names.includes('directus_users_tokens')) {
        console.log('ℹ️ Usando directus_users_tokens como fallback');
        await conn.query(
          'INSERT INTO directus_users_tokens (token, user, expires) VALUES (?, ?, ?)',
          [token, adminUserId, expiresStr],
        );
      } else if (names.includes('directus_access_tokens')) {
        console.log('ℹ️ Usando directus_access_tokens como fallback');
        await conn.query(
          'INSERT INTO directus_access_tokens (token, user, expires, revoked) VALUES (?, ?, ?, 0)',
          [token, adminUserId, expiresStr],
        );
      } else {
        throw e;
      }
    } catch (e2) {
      console.error('❌ No fue posible insertar token en tablas de tokens:', e2);
      process.exit(1);
    }
  } finally {
    await conn.end();
  }

  // Validar token contra /roles
  let validationStatus = null;
  try {
    const res = await axios.get(`${DIRECTUS_URL}/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    validationStatus = res.status;
    console.log('✅ Validación /roles con token: HTTP', res.status);
  } catch (e) {
    const status = e?.response?.status || 'ERR';
    console.error('❌ Falló validación /roles con token: HTTP', status);
    if (e?.response?.data) {
      console.error('Detalle:', JSON.stringify(e.response.data, null, 2));
    }
  }

  // Actualizar .env.local
  const envPath = await updateEnvLocal(token);
  console.log('✅ .env.local actualizado:', envPath);

  // Resumen
  console.log('--- RESUMEN ---');
  console.log('Token generado:', token);
  console.log('Admin user ID:', adminUserId);
  console.log('INSERT ejecutado:', insertSQL.replace('VALUES (?, ?, ?, \'127.0.0.1\')', `VALUES ('${token}', '${adminUserId}', '<expires>', '127.0.0.1')`));
  console.log('Validación /roles:', validationStatus ?? 'ERROR');
}

main().catch((e) => {
  console.error('❌ Error general:', e);
  process.exit(1);
});

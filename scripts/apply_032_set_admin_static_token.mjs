import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

async function main() {
  const file = path.resolve(process.cwd(), 'database', 'migrations', '032_set_admin_static_token.sql');
  const sql = fs.readFileSync(file, 'utf8');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
    port: Number(process.env.DB_PORT || 3306),
    multipleStatements: true,
  });
  try {
    await conn.query(sql);
    console.log('✅ Migration 032_set_admin_static_token applied successfully');
    console.log('ℹ️ Token configurado en DB: quintas_admin_token_2026 (directus_users.token si existe)');
  } catch (e) {
    console.error('❌ Error applying migration 032:', e);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();


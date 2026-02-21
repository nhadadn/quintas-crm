import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

async function main() {
  const file = path.resolve(process.cwd(), 'database', 'migrations', '028_register_kpis_view_and_fields.sql');
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
    console.log('✅ Migration 028_register_kpis_view_and_fields applied successfully');
  } catch (e) {
    console.error('❌ Error applying migration 028:', e);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();


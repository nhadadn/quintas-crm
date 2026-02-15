const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const SQL_PATH = path.resolve(__dirname, '..', 'database', 'migrations', '026_fix_triggers_group_by.sql');

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'narizon1',
  database: process.env.DB_DATABASE || 'quintas_otinapaV2',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  multipleStatements: true,
};

async function main() {
  console.log('🔧 Aplicando migración 026 (fix triggers GROUP BY)...');
  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  const connection = await mysql.createConnection(DB_CONFIG);
  try {
    console.time('apply_026_ms');
    await connection.query(sql);
    console.timeEnd('apply_026_ms');
    console.log('✅ Migración 026 aplicada correctamente.');
  } catch (err) {
    console.error('❌ Error aplicando migración 026:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main();

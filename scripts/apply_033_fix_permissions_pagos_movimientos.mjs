import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
async function main() {
  const file = path.resolve(process.cwd(), 'database', 'migrations', '033_fix_permissions_pagos_movimientos.sql');
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
    const [result] = await conn.query(sql);
    let affected = 0;
    if (Array.isArray(result)) {
      affected = result.reduce((acc, r) => acc + (r?.affectedRows || 0), 0);
    } else if (result && typeof result.affectedRows === 'number') {
      affected = result.affectedRows;
    }
    console.log(`✅ 033_fix_permissions_pagos_movimientos aplicada. Filas afectadas: ${affected}`);
  } catch (e) {
    console.error('❌ Error aplicando migración 033_fix_permissions_pagos_movimientos:', e);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();

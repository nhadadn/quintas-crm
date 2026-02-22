import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

async function main() {
  const file = path.resolve(process.cwd(), 'scripts', 'fix_pagos_movimientos_visibility.sql');
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
    console.log(`✅ fix_pagos_movimientos_visibility.sql aplicada. Filas afectadas totales: ${affected}`);
  } catch (e) {
    console.error('❌ Error aplicando fix_pagos_movimientos_visibility.sql:', e);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();


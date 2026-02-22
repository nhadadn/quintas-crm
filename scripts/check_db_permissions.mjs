import mysql from 'mysql2/promise';
import 'dotenv/config';

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
    port: Number(process.env.DB_PORT || 3306),
    multipleStatements: true,
  });
  try {
    const [rows] = await conn.query(
      "SELECT id, action, collection, fields, permissions FROM directus_permissions WHERE collection = 'pagos_movimientos' AND (permissions LIKE '%vendedor_id%' OR fields LIKE '%vendedor_id%')",
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log('✅ No hay reglas con vendedor_id en pagos_movimientos');
    } else {
      console.log(`⚠️ Se encontraron ${rows.length} regla(s) con "vendedor_id" en pagos_movimientos:`);
      for (const r of rows) {
        console.log('---');
        console.log('id:', r.id);
        console.log('action:', r.action);
        console.log('fields:', r.fields);
        console.log('permissions:', r.permissions);
      }
    }
  } catch (e) {
    console.error('❌ Error consultando directus_permissions:', e);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();

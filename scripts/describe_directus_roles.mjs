import mysql from 'mysql2/promise';
import 'dotenv/config';

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
    port: Number(process.env.DB_PORT || 3306),
  });
  try {
    console.log(`DESCRIBE directus_roles @ DB=${process.env.DB_DATABASE || 'quintas_otinapaV2'}`);
    const [desc] = await conn.query('DESCRIBE directus_roles');
    console.table(desc);
    // Mostrar una fila de ejemplo si existe
    try {
      const [one] = await conn.query('SELECT * FROM directus_roles LIMIT 1');
      console.log('Sample row:', one?.[0] || null);
    } catch (e) {
      console.warn('SELECT sample failed:', e.message);
    }
  } catch (e) {
    console.error('Error DESCRIBE directus_roles:', e);
  } finally {
    await conn.end();
  }
}

main();

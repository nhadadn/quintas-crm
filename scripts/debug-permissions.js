require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkPermissions() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
  });

  try {
    const [rows] = await connection.execute(
      `SELECT * FROM directus_permissions WHERE collection IN ('clientes', 'ventas', 'lotes')`
    );

    console.log('--- Current Permissions ---');
    console.log(JSON.stringify(rows, null, 2));

    // Also check roles to identify public role
    const [roles] = await connection.execute(`SELECT id, name FROM directus_roles`);
    console.log('--- Roles ---');
    console.log(JSON.stringify(roles, null, 2));
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await connection.end();
  }
}

checkPermissions();

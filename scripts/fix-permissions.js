require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixPermissions() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
  });

  try {
    console.log('--- Fixing Permissions ---');

    // 1. Set fields to '*' for clientes and ventas where it is null
    const [result] = await connection.execute(
      `UPDATE directus_permissions SET fields = '*' WHERE collection IN ('clientes', 'ventas', 'pagos', 'lotes') AND fields IS NULL`
    );

    console.log(`Updated ${result.affectedRows} permissions to have fields = '*'`);

    // 2. Verify update
    const [rows] = await connection.execute(
      `SELECT * FROM directus_permissions WHERE collection IN ('clientes', 'ventas')`
    );
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    await connection.end();
  }
}

fixPermissions();

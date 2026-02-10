const mysql = require('mysql2/promise');
require('dotenv').config();

async function getAdminRole() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'narizon1',
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
    port: process.env.DB_PORT || 3306,
  });

  try {
    const [rows] = await connection.execute(
      'SELECT id, name FROM directus_roles WHERE name = "Administrator" OR name = "Admin"'
    );
    console.log('Roles found:', rows);
    if (rows.length > 0) {
      console.log('Admin Role ID:', rows[0].id);
    } else {
      console.log('No Admin role found. Listing all roles:');
      const [allRoles] = await connection.execute('SELECT id, name FROM directus_roles LIMIT 10');
      console.log(allRoles);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

getAdminRole();

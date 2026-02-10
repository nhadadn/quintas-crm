const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
    port: process.env.DB_PORT || 3306,
  });

  const [cols] = await connection.query('DESCRIBE directus_permissions');
  console.log(
    'directus_permissions columns:',
    cols.map((c) => c.Field)
  );

  const [colsUsers] = await connection.query('DESCRIBE directus_users');
  console.log(
    'directus_users columns:',
    colsUsers.map((c) => c.Field)
  );

  await connection.end();
}

checkSchema();

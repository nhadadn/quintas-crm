const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchemaAdvanced() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
    port: process.env.DB_PORT || 3306,
  });

  try {
    const [colsPolicies] = await connection.query('DESCRIBE directus_policies');
    console.log(
      'directus_policies columns:',
      colsPolicies.map((c) => c.Field)
    );
  } catch (e) {
    console.log('No directus_policies table');
  }

  try {
    const [colsAccess] = await connection.query('DESCRIBE directus_access');
    console.log(
      'directus_access columns:',
      colsAccess.map((c) => c.Field)
    );
  } catch (e) {
    console.log('No directus_access table');
  }

  await connection.end();
}

checkSchemaAdvanced();

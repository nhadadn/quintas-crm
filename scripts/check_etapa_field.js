const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkEtapa() {
  console.log('Connecting to MySQL...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT,
    });

    console.log('Checking directus_fields for etapa...');
    const [fields] = await connection.execute(
      `SELECT * FROM directus_fields WHERE collection = 'lotes' AND field = 'etapa'`
    );
    console.log('Directus Fields:', JSON.stringify(fields, null, 2));

    console.log('Checking DB column etapa...');
    const [columns] = await connection.execute(
      `SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'lotes' AND COLUMN_NAME = 'etapa'`,
      [process.env.DB_DATABASE]
    );
    console.log('DB Columns:', JSON.stringify(columns, null, 2));

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkEtapa();

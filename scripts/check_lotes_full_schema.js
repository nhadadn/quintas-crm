const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
  console.log('Connecting to MySQL...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT
    });

    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'lotes'`,
      [process.env.DB_DATABASE]
    );

    console.log('Lotes Table Schema:');
    console.table(columns);

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSchema();

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkColumn() {
  console.log('Connecting to MySQL...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT
    });

    console.log(`Connected to ${process.env.DB_DATABASE}`);

    const [rows] = await connection.execute(
      `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE, COLUMN_DEFAULT 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'lotes' AND COLUMN_NAME = 'estatus'`,
      [process.env.DB_DATABASE]
    );
    
    if (rows.length > 0) {
      console.log('Column Definition:', JSON.stringify(rows, null, 2));
      
      // Check for NULL values
      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as count FROM lotes WHERE estatus IS NULL`
      );
      console.log('Rows with NULL estatus:', countResult[0].count);

      // Check for empty string values
      const [emptyResult] = await connection.execute(
        `SELECT COUNT(*) as count FROM lotes WHERE estatus = ''`
      );
      console.log("Rows with empty estatus:", emptyResult[0].count);

    } else {
      console.log('Column "estatus" not found in table "lotes".');
      // List columns in lotes to be sure
      const [columns] = await connection.execute(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'lotes'`,
        [process.env.DB_DATABASE]
      );
      console.log('Columns in lotes:', columns.map(c => c.COLUMN_NAME));
    }

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkColumn();

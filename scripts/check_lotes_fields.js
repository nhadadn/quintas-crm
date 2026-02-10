
require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'narizon1',
  database: process.env.DB_DATABASE || 'quintas_otinapaV2',
  port: process.env.DB_PORT || 3306
};

async function checkFields() {
  let connection;
  try {
    console.log('Connecting to database...', dbConfig.database);
    connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT * FROM directus_fields 
      WHERE collection = 'lotes' AND field = 'estatus'
    `);
    
    console.log('Fields found for lotes.estatus:', rows);

    // Also check the actual column in the lotes table if possible, but Directus manages schema abstractly.
    // However, we can check if the column exists in the database table `lotes`
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM lotes LIKE 'estatus'
    `);
    console.log('DB Column lotes.estatus:', columns);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) await connection.end();
  }
}

checkFields();

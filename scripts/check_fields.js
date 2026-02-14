require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'narizon1',
  database: process.env.DB_DATABASE || 'quintas_otinapaV2',
  port: process.env.DB_PORT || 3306,
};

async function checkFields() {
  let connection;
  try {
    console.log('Connecting to database...', dbConfig.database);
    connection = await mysql.createConnection(dbConfig);

    // Check directus_fields for lotes
    const [rows] = await connection.execute(
      "SELECT collection, field, hidden, readonly FROM directus_fields WHERE collection = 'lotes' AND field = 'estatus'"
    );
    console.log('Directus Fields for lotes.estatus:', rows);

    // Check table structure
    const [columns] = await connection.execute('DESCRIBE lotes');
    const estatusCol = columns.find((c) => c.Field === 'estatus');
    console.log('Table Column lotes.estatus:', estatusCol);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) await connection.end();
  }
}

checkFields();

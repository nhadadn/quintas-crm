require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'narizon1',
  database: process.env.DB_DATABASE || 'quintas_otinapaV2',
  port: process.env.DB_PORT || 3306,
};

async function checkDuplicates() {
  let connection;
  try {
    console.log('Connecting to database...', dbConfig.database);
    connection = await mysql.createConnection(dbConfig);

    // Check for duplicates in directus_fields
    const [rows] = await connection.execute(`
      SELECT collection, field, COUNT(*) as count 
      FROM directus_fields 
      GROUP BY collection, field 
      HAVING count > 1
    `);

    console.log('Duplicate fields found:', rows);

    if (rows.length > 0) {
      console.log('Fetching details for duplicates...');
      for (const row of rows) {
        const [details] = await connection.execute(
          `SELECT id, collection, field, required FROM directus_fields WHERE collection = ? AND field = ?`,
          [row.collection, row.field]
        );
        console.log(`Details for ${row.collection}.${row.field}:`, details);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) await connection.end();
  }
}

checkDuplicates();


require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'narizon1',
  database: process.env.DB_DATABASE || 'quintas_otinapaV2',
  port: process.env.DB_PORT || 3306
};

async function unsetArchiveField() {
  let connection;
  try {
    console.log('Connecting to database...', dbConfig.database);
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Unsetting archive_field for lotes...');
    await connection.execute(`
      UPDATE directus_collections 
      SET archive_field = NULL, archive_value = NULL, unarchive_value = NULL
      WHERE collection = 'lotes'
    `);
    
    console.log('✅ Unset archive_field for lotes.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) await connection.end();
  }
}

unsetArchiveField();

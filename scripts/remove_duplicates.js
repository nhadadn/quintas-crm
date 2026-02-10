
require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'narizon1',
  database: process.env.DB_DATABASE || 'quintas_otinapaV2',
  port: process.env.DB_PORT || 3306
};

async function removeDuplicates() {
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
    
    console.log('Duplicate fields found:', rows.length);

    if (rows.length > 0) {
        for (const row of rows) {
            // Keep the one with highest ID (newest) or lowest ID (oldest)?
            // Usually we keep the most configured one, but here they might be similar.
            // Let's keep the lowest ID (original) and delete others.
            const [ids] = await connection.execute(
                `SELECT id FROM directus_fields WHERE collection = ? AND field = ? ORDER BY id ASC`,
                [row.collection, row.field]
            );
            
            const idsToDelete = ids.slice(1).map(r => r.id);
            if (idsToDelete.length > 0) {
                console.log(`Deleting duplicates for ${row.collection}.${row.field}: IDs ${idsToDelete.join(', ')}`);
                await connection.query(
                    `DELETE FROM directus_fields WHERE id IN (?)`,
                    [idsToDelete]
                );
            }
        }
    }
    console.log('✅ Duplicates removed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) await connection.end();
  }
}

removeDuplicates();

const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: '127.0.0.1',
  user: 'root',
  password: 'narizon1',
  database: 'quintas_otinapaV2',
  port: 3306,
};

async function fixClientesIdField() {
  console.log('🔧 Fixing Clientes ID Field definition...');
  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // Check if it exists
    const [existing] = await connection.execute(
      "SELECT id FROM directus_fields WHERE collection = 'clientes' AND field = 'id'"
    );

    if (existing.length === 0) {
      console.log('📝 Inserting id field definition for clientes...');
      await connection.execute(`
                INSERT INTO directus_fields (collection, field, special, interface, readonly, hidden, width, required)
                VALUES ('clientes', 'id', 'uuid', 'input', 1, 1, 'full', 0)
            `);
      console.log('✅ ID field definition inserted.');
    } else {
      console.log('✅ ID field definition already exists.');
      // Update it just in case
      await connection.execute(`
                UPDATE directus_fields 
                SET special = 'uuid', interface = 'input', readonly = 1, hidden = 1, required = 0
                WHERE collection = 'clientes' AND field = 'id'
            `);
      console.log('🔄 ID field definition updated.');
    }
  } catch (error) {
    console.error('❌ Error fixing ID field:', error);
  } finally {
    await connection.end();
  }
}

fixClientesIdField();

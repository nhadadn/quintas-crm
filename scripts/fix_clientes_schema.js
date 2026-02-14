const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: '127.0.0.1',
  user: 'root',
  password: 'narizon1',
  database: 'quintas_otinapaV2',
  port: 3306,
};

async function fixClientesSchema() {
  console.log('🔧 Fixing Clientes Schema...');
  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // 1. Check if user_created exists
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM clientes WHERE Field = 'user_created'"
    );

    if (columns.length === 0) {
      console.log('➕ Adding user_created column...');
      await connection.execute('ALTER TABLE clientes ADD COLUMN user_created CHAR(36) NULL');

      // Copy user_id to user_created
      console.log('📋 Copying user_id to user_created...');
      await connection.execute('UPDATE clientes SET user_created = user_id');

      // Add Foreign Key (optional, but good for integrity)
      // Note: user_id might contain values that don't exist in directus_users if they were deleted or dummy data
      // So we might skip FK constraint or ensure data is valid first.
      // For now, let's skip FK constraint to avoid errors, as Directus doesn't strictly require DB-level FK for this to work.
      // But Directus expects it to be a UUID.
    } else {
      console.log('✅ user_created column already exists.');
    }

    // 2. Check if user_updated exists
    const [updatedCols] = await connection.execute(
      "SHOW COLUMNS FROM clientes WHERE Field = 'user_updated'"
    );
    if (updatedCols.length === 0) {
      console.log('➕ Adding user_updated column...');
      await connection.execute('ALTER TABLE clientes ADD COLUMN user_updated CHAR(36) NULL');
    } else {
      console.log('✅ user_updated column already exists.');
    }

    // 3. Update directus_fields to register user_created (System Field)
    // We need to see if it's already there
    const [fields] = await connection.execute(
      "SELECT id FROM directus_fields WHERE collection = 'clientes' AND field = 'user_created'"
    );
    if (fields.length === 0) {
      console.log('📝 Registering user_created in directus_fields...');
      await connection.execute(`
                INSERT INTO directus_fields (collection, field, special, interface, readonly, hidden, width)
                VALUES ('clientes', 'user_created', 'user-created', 'select-dropdown-m2o', 1, 1, 'half')
            `);
    }

    // 4. Update directus_fields to register user_updated (System Field)
    const [fieldsUp] = await connection.execute(
      "SELECT id FROM directus_fields WHERE collection = 'clientes' AND field = 'user_updated'"
    );
    if (fieldsUp.length === 0) {
      console.log('📝 Registering user_updated in directus_fields...');
      await connection.execute(`
                INSERT INTO directus_fields (collection, field, special, interface, readonly, hidden, width)
                VALUES ('clientes', 'user_updated', 'user-updated', 'select-dropdown-m2o', 1, 1, 'half')
            `);
    }

    console.log('✅ Schema fix complete.');
  } catch (error) {
    console.error('❌ Error fixing schema:', error);
  } finally {
    await connection.end();
  }
}

fixClientesSchema();

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixSchema() {
  console.log('Connecting to MySQL...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT
    });

    console.log('Adding column etapa to lotes...');
    try {
        await connection.execute(
            "ALTER TABLE lotes ADD COLUMN etapa VARCHAR(255) NULL DEFAULT NULL"
        );
        console.log('✅ Added column etapa');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('Column etapa already exists.');
        } else {
            console.error('Error adding etapa:', e);
        }
    }

    // Verify other columns
    const columnsToCheck = ['manzana', 'zona', 'geometria'];
    for (const col of columnsToCheck) {
        const [rows] = await connection.execute(
            `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'lotes' AND COLUMN_NAME = ?`,
            [process.env.DB_DATABASE, col]
        );
        if (rows.length === 0) {
            console.log(`⚠️ Column ${col} is missing! Adding it...`);
            // Add missing columns if needed.
            // manzana: varchar, zona: varchar, geometria: point (if using spatial)
            if (col === 'geometria') {
                 // Skip geometry for now as it requires specific type knowledge
                 console.log('Skipping auto-add for geometria. Please check manually.');
            } else {
                 await connection.execute(
                    `ALTER TABLE lotes ADD COLUMN ${col} VARCHAR(255) NULL DEFAULT NULL`
                 );
                 console.log(`✅ Added column ${col}`);
            }
        } else {
            console.log(`✅ Column ${col} exists.`);
        }
    }

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixSchema();

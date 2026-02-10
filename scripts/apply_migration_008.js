const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    multipleStatements: true,
  });

  try {
    const migrationPath = path.join(
      __dirname,
      '../database/migrations/008_create_suscripciones_tables.sql'
    );
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    console.log('DB Config:', {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      db: process.env.DB_DATABASE,
    });
    await connection.query(sql);
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await connection.end();
  }
}

runMigration();

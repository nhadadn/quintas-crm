const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function runMigration(filePath) {
  console.log(`Applying migration: ${filePath}`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true, // Important for SQL files with multiple statements
  });

  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await connection.query(sql);
    console.log(`✅ Migration ${filePath} applied successfully.`);
  } catch (err) {
    console.error(`❌ Error applying migration ${filePath}:`, err);
  } finally {
    await connection.end();
  }
}

const file = process.argv[2];
if (!file) {
  console.error('Please provide a migration file path.');
  process.exit(1);
}

runMigration(file);

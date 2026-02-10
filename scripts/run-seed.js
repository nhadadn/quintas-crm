const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
    port: process.env.DB_PORT || 3306,
  });

  const sqlPath = path.join(__dirname, 'seed-lotes.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('No seed SQL found');
    return;
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8');

  try {
    console.log('Cleaning existing data...');
    // Disable FK checks to allow truncation
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE ventas');
    await connection.query('TRUNCATE TABLE lotes');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Inserting new compatible lotes...');
    await connection.query(sql);
    console.log('✅ Database seeded with map-compatible data!');
  } catch (e) {
    console.error('Seed error:', e);
  } finally {
    await connection.end();
  }
}

seed();

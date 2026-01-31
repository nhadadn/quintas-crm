const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkClientesIndices() {
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  };

  const conn = await mysql.createConnection(config);
  try {
    console.log('--- Indices de Clientes ---');
    const [rows] = await conn.query(`SHOW INDEX FROM clientes`);
    console.table(rows);
  } catch (e) {
    console.error(e);
  } finally {
    conn.end();
  }
}

checkClientesIndices();

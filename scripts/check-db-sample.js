const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
    port: process.env.DB_PORT || 3306,
  });

  const [rows] = await connection.query('SELECT id, manzana, numero_lote FROM lotes LIMIT 5');
  console.log('Sample Data:', rows);
  await connection.end();
}

checkData();

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAccess() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  const [rows] = await connection.query('SELECT * FROM directus_access WHERE role = ?', [
    '958022d8-5421-4202-8610-85af40751339',
  ]);
  console.log('Access records for role 958022d8-5421-4202-8610-85af40751339:', rows);

  await connection.end();
}

checkAccess();

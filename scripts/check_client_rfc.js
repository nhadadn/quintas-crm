const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkClient() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  const [rows] = await connection.query(
    'SELECT id, email, rfc, user_id FROM clientes WHERE rfc = ?',
    ['XAXX010101000']
  );
  console.log('Client with RFC XAXX010101000:', rows);

  await connection.end();
}

checkClient();

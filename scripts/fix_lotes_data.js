const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixData() {
  console.log('Connecting to MySQL...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT
    });

    console.log('Fixing NULL values in lotes.estatus...');
    const [result] = await connection.execute(
      "UPDATE lotes SET estatus = 'disponible' WHERE estatus IS NULL"
    );
    console.log(`Updated ${result.affectedRows} rows.`);

    console.log('Ensuring directus_fields is correct...');
    const [result2] = await connection.execute(
        "UPDATE directus_fields SET required = 0 WHERE collection = 'lotes' AND field = 'estatus'"
    );
    console.log(`Updated ${result2.affectedRows} directus_fields rows.`);

    console.log('Fixing empty string values in lotes.estatus...');
    const [result3] = await connection.execute(
      "UPDATE lotes SET estatus = 'disponible' WHERE estatus = ''"
    );
    console.log(`Updated ${result3.affectedRows} rows (empty string).`);

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixData();

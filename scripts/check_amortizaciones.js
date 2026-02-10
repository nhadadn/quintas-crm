const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAmortizacionesColumns() {
  console.log('Connecting to MySQL...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT
    });

    console.log(`Connected to ${process.env.DB_DATABASE}`);

    // Check columns in pagos
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pagos'`,
      [process.env.DB_DATABASE]
    );
    
    console.log('Columns in pagos:', columns.map(c => c.COLUMN_NAME));
    
    // Check columns in comisiones
    const [columnsCom] = await connection.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'comisiones'`,
      [process.env.DB_DATABASE]
    );
    
    console.log('Columns in comisiones:', columnsCom.map(c => c.COLUMN_NAME));

    // Check directus_fields for pagos id
    const [directusField] = await connection.execute(
        `SELECT * FROM directus_fields WHERE collection = 'pagos' AND field = 'id'`,
    );
    console.log('Directus Field Config for pagos.id:', directusField[0]);


    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAmortizacionesColumns();

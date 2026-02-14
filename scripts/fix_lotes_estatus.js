require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'narizon1',
  database: process.env.DB_DATABASE || 'quintas_otinapaV2',
  port: process.env.DB_PORT || 3306,
};

async function fixLotesEstatus() {
  let connection;
  try {
    console.log('Connecting to database...', dbConfig.database);
    connection = await mysql.createConnection(dbConfig);

    // Update directus_fields for lotes.estatus
    // Set interface to select-dropdown and options
    const options = {
      choices: [
        { text: 'Disponible', value: 'disponible' },
        { text: 'Apartado', value: 'apartado' },
        { text: 'Vendido', value: 'vendido' },
        { text: 'Liquidado', value: 'liquidado' },
        { text: 'Bloqueado', value: 'bloqueado' },
      ],
    };

    console.log('Updating directus_fields for lotes.estatus...');
    await connection.execute(
      `
      UPDATE directus_fields 
      SET interface = ?, options = ?
      WHERE collection = 'lotes' AND field = 'estatus'
    `,
      ['select-dropdown', JSON.stringify(options)]
    );

    console.log('✅ Updated lotes.estatus field config.');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) await connection.end();
  }
}

fixLotesEstatus();

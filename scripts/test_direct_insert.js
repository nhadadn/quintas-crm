const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDirectInsert() {
  console.log('Connecting to MySQL...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT,
    });

    console.log('Inserting row directly...');
    const lote = {
      numero_lote: `DIRECT-${Date.now()}`,
      precio_lista: 100000,
      estatus: 'disponible',
      etapa: '1',
      fondo_m: 20,
      latitud: 24.0,
      longitud: -104.0,
      manzana: 'M1',
      zona: 'A',
    };

    // Note: geometry column handling in raw SQL might be tricky if it's spatial.
    // For now omitting geometria or using ST_GeomFromText if needed.
    // Assuming simple columns first.

    const [result] = await connection.execute(
      `INSERT INTO lotes (numero_lote, precio_lista, estatus, etapa, fondo_m, latitud, longitud, manzana, zona) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lote.numero_lote,
        lote.precio_lista,
        lote.estatus,
        lote.etapa,
        lote.fondo_m,
        lote.latitud,
        lote.longitud,
        lote.manzana,
        lote.zona,
      ]
    );

    console.log('Insert ID:', result.insertId);
    console.log('✅ Direct Insert Successful');

    await connection.end();
  } catch (error) {
    console.error('❌ Direct Insert Failed:', error);
  }
}

testDirectInsert();

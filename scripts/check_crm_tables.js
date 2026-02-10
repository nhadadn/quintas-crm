const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE || 'quintas_otinapaV2',
      port: process.env.DB_PORT || 3306,
    });

    const tables = [
      'clientes',
      'vendedores',
      'ventas',
      'pagos',
      'comisiones',
      'planes_pagos',
      'suscripciones',
      'amortizaciones',
    ];
    const missing = [];

    for (const table of tables) {
      const [rows] = await connection.query(`SHOW TABLES LIKE '${table}'`);
      if (rows.length === 0) {
        missing.push(table);
      } else {
        console.log(`✅ Table '${table}' exists.`);
      }
    }

    if (missing.length > 0) {
      console.log(`❌ Missing tables: ${missing.join(', ')}`);
      process.exit(1);
    } else {
      console.log('✅ All CRM tables exist.');
      process.exit(0);
    }

    await connection.end();
  } catch (error) {
    console.error('Error checking tables:', error);
    process.exit(1);
  }
}

checkTables();

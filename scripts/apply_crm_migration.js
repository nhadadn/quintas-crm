const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MIGRATION_FILE = path.join(__dirname, '../database/migrations/001_create_crm_schema.sql');

async function main() {
  console.log('🚀 Iniciando migración de esquema CRM...');

  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    multipleStatements: true // Importante para ejecutar scripts SQL completos
  };

  console.log(`🔌 Conectando a ${config.host}:${config.port}/${config.database} como ${config.user}...`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Conexión exitosa.');

    // Pre-migration cleanup: Drop specific FKs if they exist to avoid conflicts
    await dropForeignKeyIfExists(connection, 'lotes', 'fk_lotes_cliente');
    await dropForeignKeyIfExists(connection, 'lotes', 'fk_lotes_vendedor');

    console.log(`📖 Leyendo archivo de migración: ${MIGRATION_FILE}`);
    const sqlContent = fs.readFileSync(MIGRATION_FILE, 'utf8');

    console.log('⚡ Ejecutando sentencias SQL...');
    
    // Ejecutar todo el script
    await connection.query(sqlContent);
    
    console.log('✅ Migración completada exitosamente.');
    console.log('   Tablas creadas/verificadas: clientes, vendedores, ventas, pagos, comisiones.');

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   -> Asegúrate de que MySQL esté corriendo y accesible.');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('👋 Conexión cerrada.');
    }
  }
}

async function dropForeignKeyIfExists(conn, tableName, constraintName) {
  try {
    const [rows] = await conn.query(`
      SELECT CONSTRAINT_NAME 
      FROM information_schema.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = ? 
      AND CONSTRAINT_NAME = ?
    `, [tableName, constraintName]);

    if (rows.length > 0) {
      console.log(`   🔧 Eliminando FK existente: ${constraintName} en ${tableName}...`);
      await conn.query(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${constraintName}\``);
    }
  } catch (err) {
    console.warn(`   ⚠️ Advertencia al intentar borrar FK ${constraintName}: ${err.message}`);
  }
}

main();

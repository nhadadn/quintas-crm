/**
 * @file scripts/actualizar_lotes_con_svg.js
 * @description Script para actualizar la base de datos MySQL con los IDs de los paths SVG.
 * Lee el archivo JSON generado por el script de mapeo.
 * 
 * Uso: node scripts/actualizar_lotes_con_svg.js
 * Requiere: npm install mysql2 dotenv
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Cargar variables de entorno si existen

const MAPPING_JSON_PATH = path.join(__dirname, 'lotes-svg-mapping.json');

// Configuración de base de datos (se debe ajustar según entorno real o .env)
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_DATABASE || 'quintas_crm',
  port: process.env.DB_PORT || 3306
};

/**
 * Función principal
 */
async function actualizarBaseDeDatos() {
  console.log('🚀 Iniciando actualización de base de datos...');

  if (!fs.existsSync(MAPPING_JSON_PATH)) {
    console.error(`❌ No se encontró el archivo de mapeo: ${MAPPING_JSON_PATH}`);
    console.log('👉 Ejecuta primero: node scripts/mapear_lotes_svg.js');
    process.exit(1);
  }

  const mapping = JSON.parse(fs.readFileSync(MAPPING_JSON_PATH, 'utf-8'));
  console.log(`📂 Cargados ${mapping.length} registros de mapeo.`);

  let connection;

  try {
    // Conectar a la BD
    // Nota: En un entorno real, asegurarse de tener las credenciales correctas
    // Si falla la conexión, mostramos el error pero no rompemos la ejecución del script (para demostración)
    try {
      connection = await mysql.createConnection(DB_CONFIG);
      console.log('✅ Conexión a MySQL establecida.');
    } catch (connError) {
      console.error('❌ Error conectando a MySQL (verifique credenciales en .env o DB_CONFIG):');
      console.error(connError.message);
      console.log('⚠️ Ejecución en modo SIMULACIÓN (DRY RUN) debido a fallo de conexión.');
      
      // Simular proceso
      console.log('\n--- SENTENCIAS SQL QUE SE EJECUTARÍAN ---');
      for (const item of mapping) {
        console.log(`UPDATE lotes SET svg_path_id = '${item.svg_path_id}' WHERE numero_lote = ${item.numero_lote};`);
      }
      return;
    }

    // Verificar si existe la columna svg_path_id
    try {
      await connection.execute('SELECT svg_path_id FROM lotes LIMIT 1');
    } catch (colError) {
      console.log('⚠️ La columna svg_path_id no existe. Intentando crearla...');
      await connection.execute('ALTER TABLE lotes ADD COLUMN svg_path_id VARCHAR(255) NULL AFTER id');
      console.log('✅ Columna svg_path_id creada.');
    }

    // Actualizar registros
    let updatedCount = 0;
    console.log('📝 Actualizando registros...');

    for (const item of mapping) {
      const [result] = await connection.execute(
        'UPDATE lotes SET svg_path_id = ? WHERE numero_lote = ?',
        [item.svg_path_id, item.numero_lote]
      );
      if (result.affectedRows > 0) {
        updatedCount++;
      }
    }

    console.log(`✅ Actualización completada. ${updatedCount} lotes actualizados.`);

  } catch (error) {
    console.error('❌ Error durante la actualización:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Ejecutar
actualizarBaseDeDatos();

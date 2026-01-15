import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
  console.log('🔧 Iniciando reparación de base de datos Directus...');
  
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  };

  console.log(`Conectando a ${config.host}:${config.port} como ${config.user}...`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Conexión exitosa.');

    const columns = [
      'project_owner',
      'project_usage',
      'org_name',
      'product_updates',
      'project_status'
    ];

    console.log('🔍 Intentando eliminar columnas duplicadas en directus_settings...');

    for (const col of columns) {
      try {
        await connection.query(`ALTER TABLE directus_settings DROP COLUMN ${col}`);
        console.log(`✅ Columna '${col}' eliminada correctamente.`);
      } catch (error) {
        if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
           console.log(`ℹ️ Columna '${col}' no existía, saltando.`);
        } else {
           console.warn(`⚠️ Error al intentar borrar '${col}': ${error.message}`);
        }
      }
    }

    console.log('🏁 Reparación finalizada. Ahora intenta correr las migraciones de nuevo.');

  } catch (error) {
    console.error('❌ Error fatal:', error);
  } finally {
    if (connection) await connection.end();
  }
}

main();
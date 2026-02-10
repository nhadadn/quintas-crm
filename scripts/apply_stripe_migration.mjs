import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load env from root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || 'quintas_otinapaV2',
  multipleStatements: true,
};

async function runMigration() {
  console.log('🔌 Conectando a base de datos...');
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado.');

    const migrationFile = path.resolve(
      __dirname,
      '../database/migrations/007_create_stripe_webhooks_logs.sql'
    );
    const sql = fs.readFileSync(migrationFile, 'utf-8');

    console.log(`📜 Ejecutando migración: ${path.basename(migrationFile)}`);
    await connection.query(sql);
    console.log('✅ Migración ejecutada exitosamente.');
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();

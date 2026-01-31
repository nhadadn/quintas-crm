const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const CONFIG_PATH = path.join(__dirname, '../frontend/public/mapas/scripts/frontend-config.json');

async function main() {
  console.log('--- Verificación de Integridad Mapa SVG vs Directus DB ---');

  // 1. Cargar Configuración SVG
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ No se encontró frontend-config.json');
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  
  // Extraer IDs interactivos
  // Formato esperado ID: M-29L-8 (Manzana 29, Lote 8)
  const svgLotes = [];
  config.paths.forEach(p => {
    if (p.interactive || (p.id && p.id.match(/^M-\d+L-\d+/))) {
      const match = p.id.match(/^M-(\d+)L-(\d+)/);
      if (match) {
        svgLotes.push({
          id: p.id,
          manzana: match[1],
          lote: match[2]
        });
      }
    }
  });

  console.log(`✅ Mapa SVG: Encontrados ${svgLotes.length} lotes interactivos.`);
  if (svgLotes.length === 0) {
    console.warn('⚠️ No se encontraron lotes con formato M-XXL-YY. Revisa generate-official-config.js');
  }

  // 2. Conectar a Base de Datos
  console.log('Conectando a base de datos...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
    port: process.env.DB_PORT || 3306
  });

  try {
    // 3. Verificar Tabla
    const [tables] = await connection.query("SHOW TABLES LIKE 'lotes'");
    if (tables.length === 0) {
      console.error('❌ La tabla "lotes" no existe en Directus.');
      return;
    }

    // 4. Comparar Datos
    const [dbLotes] = await connection.query("SELECT manzana, numero_lote, estatus FROM lotes");
    console.log(`✅ Directus DB: Encontrados ${dbLotes.length} registros en tabla 'lotes'.`);

    // Crear Set para búsqueda rápida
    const dbSet = new Set(dbLotes.map(l => `M-${l.manzana}L-${l.numero_lote}`));

    let matches = 0;
    let missingInDb = 0;

    svgLotes.forEach(svgLote => {
      if (dbSet.has(svgLote.id)) {
        matches++;
      } else {
        missingInDb++;
      }
    });

    console.log(`\n--- Resultados de Integridad ---`);
    console.log(`Coincidencias (Mapa = DB): ${matches}`);
    console.log(`Faltantes en DB (Están en Mapa pero no en DB): ${missingInDb}`);

    if (missingInDb > 0) {
      console.log(`\n⚠️ Hay ${missingInDb} lotes en el mapa que no están en la base de datos.`);
      console.log('¿Deseas generar un script SQL para insertarlos? (Se generará seed-lotes.sql)');
      
      const sqlValues = svgLotes
        .filter(l => !dbSet.has(l.id))
        .map(l => {
            const zona = l.manzana < 20 ? 'A' : 'B'; 
            // Unique constraint on numero_lote requires unique values. Using Manzana-Lote format.
            const uniqueLote = `${l.manzana}-${l.lote}`;
            return `('${uniqueLote}', '${l.manzana}', 'disponible', '${zona}', '{"type":"Point","coordinates":[0,0]}', 24.0, -104.0, 1000.00, 500000.00)`;
        })
        .join(',\n');

      if (sqlValues) {
        const sql = `INSERT INTO lotes (numero_lote, manzana, estatus, zona, geometria, latitud, longitud, area_m2, precio_lista) VALUES\n${sqlValues};`;
        fs.writeFileSync(path.join(__dirname, 'seed-lotes.sql'), sql);
        console.log('✅ Archivo seed-lotes.sql generado. Ejecútalo en tu DB para sincronizar.');
        
        // Opcional: Insertar automáticamente
        // await connection.query(sql); 
      }
    } else {
        console.log("✅ ¡Sincronización perfecta! Todos los lotes del mapa existen en la BD.");
    }

  } catch (err) {
    console.error('Error durante verificación:', err);
  } finally {
    await connection.end();
  }
}

main();

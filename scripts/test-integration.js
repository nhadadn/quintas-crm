/**
 * @file scripts/test-integration.js
 * @description Script de validación para probar la integración de los componentes SVG.
 * Verifica:
 * 1. Existencia de archivos críticos.
 * 2. Disponibilidad de módulos requeridos.
 * 3. Conectividad básica con el endpoint de Directus (si el servidor está corriendo).
 *
 * Uso: node scripts/test-integration.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const CONFIG = {
  svgPath: path.join(__dirname, '../frontend/public/mapas/mapa-quintas.svg'),
  mappingPath: path.join(__dirname, 'lotes-svg-mapping.json'),
  endpointUrl: 'http://localhost:8055/svg-map',
};

async function runTests() {
  console.log('🧪 Iniciando pruebas de integración...\n');
  let errors = 0;

  // TEST 1: Verificar archivos
  console.log('1️⃣  Verificando archivos...');
  if (fs.existsSync(CONFIG.svgPath)) {
    console.log('   ✅ Archivo SVG encontrado.');
  } else {
    console.error(`   ❌ Archivo SVG NO encontrado en: ${CONFIG.svgPath}`);
    errors++;
  }

  if (fs.existsSync(CONFIG.mappingPath)) {
    console.log('   ✅ Archivo de mapeo JSON encontrado.');
  } else {
    console.warn(
      `   ⚠️ Archivo de mapeo JSON no encontrado. (Ejecuta primero mapear_lotes_svg.js)`
    );
  }

  // TEST 2: Verificar módulos
  console.log('\n2️⃣  Verificando dependencias...');
  try {
    require('mysql2');
    console.log('   ✅ mysql2 instalado.');
  } catch (e) {
    console.error('   ❌ mysql2 no instalado. Ejecuta: npm install mysql2');
    errors++;
  }

  try {
    require('xml2js');
    console.log('   ✅ xml2js instalado.');
  } catch (e) {
    console.error('   ❌ xml2js no instalado. Ejecuta: npm install xml2js');
    errors++;
  }

  // TEST 3: Verificar endpoint
  console.log('\n3️⃣  Verificando endpoint de Directus...');
  console.log(`   Intentando conectar a ${CONFIG.endpointUrl}...`);

  try {
    const status = await checkEndpoint(CONFIG.endpointUrl);
    if (status === 200) {
      console.log('   ✅ Endpoint responde correctamente (200 OK).');
    } else if (status === 404) {
      console.warn(
        '   ⚠️ Endpoint responde 404. Es posible que la extensión no esté cargada o Directus no esté corriendo.'
      );
    } else {
      console.warn(`   ⚠️ Endpoint responde con estado: ${status}`);
    }
  } catch (e) {
    console.warn(`   ⚠️ No se pudo conectar a Directus: ${e.message}`);
    console.warn('      (Esto es normal si el servidor no está corriendo en este momento)');
  }

  console.log('\n----------------------------------------');
  if (errors === 0) {
    console.log('✅ VALIDACIÓN EXITOSA: La estructura parece correcta.');
  } else {
    console.error(`❌ VALIDACIÓN FALLIDA: Se encontraron ${errors} errores críticos.`);
  }
}

function checkEndpoint(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode);
    });
    req.on('error', (err) => reject(err));
    req.end();
  });
}

runTests();

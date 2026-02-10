/**
 * @file scripts/procesar-svg-correcto.js
 * @description Procesa SVG correcto de LibreCAD/QCAD
 * Extrae polígonos de lotes y genera mapeo automático
 */

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const SVG_PATH = path.join(__dirname, '../mapa-quintas.svg');
const OUTPUT_MAPPING = path.join(__dirname, 'lotes-mapping-final.json');
const OUTPUT_SQL = path.join(__dirname, 'actualizar-lotes-svg.sql');

async function procesarSVGCorrecto() {
  console.log('🔍 Procesando SVG correcto de LibreCAD...\n');

  if (!fs.existsSync(SVG_PATH)) {
    console.error(`❌ No encontrado: ${SVG_PATH}`);
    console.error('⚠️  Asegúrate de exportar desde LibreCAD como: mapa-quintas-LIBRECAD.svg');
    process.exit(1);
  }

  const svgContent = fs.readFileSync(SVG_PATH, 'utf-8');
  const parser = new xml2js.Parser();

  try {
    const result = await parser.parseStringPromise(svgContent);

    // Extraer grupos (capas)
    const groups = result.svg.g || [];
    console.log(`📊 Grupos encontrados: ${groups.length}`);

    // Buscar grupo de lotes
    const lotesGroup = groups.find(
      (g) =>
        g.$ &&
        (g.$.id?.toLowerCase().includes('lote') ||
          g.$.id?.toLowerCase().includes('parcel') ||
          g.$.id?.toLowerCase().includes('block')),
    );

    if (!lotesGroup) {
      console.warn('⚠️  No se encontró grupo específico de lotes');
      console.log('📋 Grupos disponibles:');
      groups.forEach((g, i) => {
        console.log(`   [${i}] ${g.$.id || 'sin-id'}`);
      });
    }

    // Extraer polígonos
    const polygons = [];

    // Buscar en todos los grupos
    groups.forEach((group, groupIndex) => {
      if (group.polygon) {
        group.polygon.forEach((poly, polyIndex) => {
          const points = poly.$.points;
          const id = poly.$.id || `polygon-${groupIndex}-${polyIndex}`;

          polygons.push({
            id: id,
            groupId: group.$.id,
            points: points,
            pointCount: (points.match(/,/g) || []).length + 1,
            boundingBox: calculateBoundingBox(points),
          });
        });
      }
    });

    console.log(`\n✅ Polígonos encontrados: ${polygons.length}`);

    if (polygons.length === 0) {
      console.error('❌ No se encontraron polígonos en el SVG');
      console.error('⚠️  Verifica que el SVG contiene polígonos de lotes');
      process.exit(1);
    }

    // Filtrar polígonos que parecen ser lotes
    // (polígonos cerrados con área significativa)
    const lotesPolygons = polygons.filter((p) => p.pointCount >= 4);

    console.log(`🏘️  Polígonos que parecen ser lotes: ${lotesPolygons.length}`);

    // Generar mapeo
    const mapping = generarMapeo(lotesPolygons);

    // Guardar mapeo
    fs.writeFileSync(
      OUTPUT_MAPPING,
      JSON.stringify(
        {
          metadata: {
            fecha: new Date().toISOString(),
            total_poligonos: polygons.length,
            lotes_identificados: mapping.length,
            fuente: 'LibreCAD/QCAD SVG',
          },
          lotes: mapping,
        },
        null,
        2,
      ),
    );

    console.log(`\n💾 Mapeo guardado: ${OUTPUT_MAPPING}`);

    // Generar SQL
    generarSQL(mapping, OUTPUT_SQL);

    // Mostrar resumen
    mostrarResumen(mapping);
  } catch (error) {
    console.error('❌ Error procesando SVG:', error.message);
    process.exit(1);
  }
}

/**
 * Calcula bounding box de un polígono
 */
function calculateBoundingBox(pointsString) {
  const points = pointsString.split(' ').map((p) => {
    const [x, y] = p.split(',').map(Number);
    return { x, y };
  });

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
    centerX: (Math.min(...xs) + Math.max(...xs)) / 2,
    centerY: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

/**
 * Genera mapeo de lotes
 */
function generarMapeo(polygons) {
  // Ordenar por posición (izquierda a derecha, arriba a abajo)
  const sorted = polygons.sort((a, b) => {
    if (Math.abs(a.boundingBox.minY - b.boundingBox.minY) > 100) {
      return a.boundingBox.minY - b.boundingBox.minY;
    }
    return a.boundingBox.minX - b.boundingBox.minX;
  });

  // Generar IDs de lotes
  const mapping = sorted.map((poly, index) => {
    const numero = index + 1;
    const zona = String.fromCharCode(65 + Math.floor(numero / 25)); // A, B, C...
    const manzana = String((Math.floor(numero / 5) % 10) + 1).padStart(2, '0');
    const lote = String((numero % 5) + 1).padStart(3, '0');

    return {
      id: numero,
      numero_lote: `${zona}-${manzana}-${lote}`,
      zona: zona,
      manzana: manzana,
      svg_path_id: poly.id,
      svg_points: poly.points,
      centroide_x: poly.boundingBox.centerX,
      centroide_y: poly.boundingBox.centerY,
      area_aproximada: poly.boundingBox.width * poly.boundingBox.height,
    };
  });

  return mapping;
}

/**
 * Genera script SQL para actualizar BD
 */
function generarSQL(mapping, outputPath) {
  const sql = `
-- ========================================
-- Actualizar lotes con datos SVG
-- Generado automáticamente desde SVG
-- ========================================

USE quintas_otinapa;

-- Crear tabla temporal
CREATE TEMPORARY TABLE lotes_temp (
  numero_lote VARCHAR(20),
  svg_path_id VARCHAR(100),
  svg_points TEXT,
  centroide_x DECIMAL(10,2),
  centroide_y DECIMAL(10,2)
);

-- Insertar datos
${mapping
  .map(
    (lote) => `
INSERT INTO lotes_temp VALUES (
  '${lote.numero_lote}',
  '${lote.svg_path_id}',
  '${lote.svg_points.replace(/'/g, "''")}',
  ${lote.centroide_x},
  ${lote.centroide_y}
);
`,
  )
  .join('')}

-- Actualizar tabla lotes
UPDATE lotes l
JOIN lotes_temp t ON l.numero_lote = t.numero_lote
SET 
  l.svg_path_id = t.svg_path_id,
  l.svg_coordinates = t.svg_points,
  l.svg_centroid_x = t.centroide_x,
  l.svg_centroid_y = t.centroide_y
WHERE l.numero_lote = t.numero_lote;

-- Verificar actualización
SELECT COUNT(*) as lotes_actualizados 
FROM lotes 
WHERE svg_path_id IS NOT NULL;

-- Mostrar primeros 5 lotes actualizados
SELECT numero_lote, svg_path_id, svg_centroid_x, svg_centroid_y
FROM lotes
WHERE svg_path_id IS NOT NULL
LIMIT 5;

SELECT '✅ Actualización completada' as status;
`;

  fs.writeFileSync(outputPath, sql);
  console.log(`\n📝 Script SQL generado: ${outputPath}`);
}

/**
 * Muestra resumen
 */
function mostrarResumen(mapping) {
  console.log('\n📋 RESUMEN:');
  console.log('════════════════════════════════════════════════');
  console.log(`✅ Lotes identificados: ${mapping.length}`);
  console.log(`✅ Primeros 5 lotes:`);

  mapping.slice(0, 5).forEach((lote) => {
    console.log(`   - ${lote.numero_lote} (${lote.svg_path_id})`);
  });

  console.log(`\n📊 Próximos pasos:`);
  console.log(`   1. Revisar: ${OUTPUT_MAPPING}`);
  console.log(`   2. Ejecutar SQL: mysql -u root -p < ${OUTPUT_SQL}`);
  console.log(`   3. Verificar: SELECT * FROM lotes WHERE svg_path_id IS NOT NULL LIMIT 5;`);
}

// Ejecutar
procesarSVGCorrecto();

import path from 'path';
import fs from 'fs';
import type { SVGPathMapping } from '../frontend/types/svg';

async function main() {
  const mappingPath = path.resolve(__dirname, './lotes-svg-mapping.json');
  console.log('Leyendo mapeo desde:', mappingPath);

  const exists = fs.existsSync(mappingPath);
  if (!exists) {
    console.error('No se encontró lotes-svg-mapping.json. Ejecuta primero map-lotes-to-svg.ts');
    process.exit(1);
  }

  const raw = await fs.promises.readFile(mappingPath, 'utf8');
  const mappings = JSON.parse(raw) as SVGPathMapping[];

  console.log('Ejemplo de SQL que podrías ejecutar manualmente contra la base de datos:');
  mappings.slice(0, 5).forEach((m) => {
    const sql = `UPDATE lotes SET svg_path_id = '${m.svgPathId}' WHERE id = ${m.loteId};`;
    console.log(sql);
  });
}

void main().catch((error) => {
  console.error('Error preparando actualización de base de datos:', error);
  process.exit(1);
});


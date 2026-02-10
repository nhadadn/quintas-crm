import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';

async function main() {
  const svgPath = path.resolve(__dirname, '../frontend/public/mapas/mapa-quintas.svg');
  console.log(`Analizando SVG: ${svgPath}`);

  const svgContent = await fs.promises.readFile(svgPath, 'utf8');
  const parsed = await parseStringPromise(svgContent);

  const rootKeys = Object.keys(parsed);
  console.log('Raíces encontradas en el SVG:', rootKeys);

  if (parsed.svg && parsed.svg.g) {
    console.log('Se encontraron grupos <g> en el SVG.');
  }
}

void main().catch((error) => {
  console.error('Error analizando SVG:', error);
  process.exit(1);
});

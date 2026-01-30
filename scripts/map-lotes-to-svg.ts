import path from 'path';
import fs from 'fs';
import type { Lote } from '../frontend/types/lote';
import { mapLotesToSVGPaths } from '../frontend/lib/svg/svg-mapper';
import type { SVGMapConfig } from '../frontend/types/svg';

async function main() {
  const config: SVGMapConfig = {
    svgFilePath: path.resolve(__dirname, '../frontend/public/mapas/mapa-quintas.svg'),
    viewBox: '0 0 1000 1000',
    loteIdPrefix: 'lote-',
  };

  const lotesSample: Lote[] = [
    {
      id: 1,
      numero_lote: '1',
      zona: 'A',
      manzana: '1',
      area_m2: 100,
      frente_m: 10,
      fondo_m: 10,
      estatus: 'disponible',
      precio_lista: 100000,
      topografia: 'plano',
      vista: 'bosque',
      geometria: null,
      p_coordenadas: undefined,
      latitud: 0,
      longitud: 0,
      cliente_id: null,
      vendedor_id: null,
      notas: '',
      created_at: '',
      updated_at: '',
    },
  ];

  const mappings = mapLotesToSVGPaths(lotesSample, config);
  const outputPath = path.resolve(__dirname, './lotes-svg-mapping.json');

  await fs.promises.writeFile(outputPath, JSON.stringify(mappings, null, 2), 'utf8');

  console.log('Mapeo de lotes a paths SVG generado en:', outputPath);
}

void main().catch((error) => {
  console.error('Error generando mapeo de lotes a SVG:', error);
  process.exit(1);
});


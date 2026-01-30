import type { Lote } from '@/types/lote';
import type { SVGMapConfig, SVGPathMapping } from '@/types/svg';

export function mapLotesToSVGPaths(lotes: Lote[], config: SVGMapConfig): SVGPathMapping[] {
  return lotes.map((lote) => ({
    loteId: lote.id,
    svgPathId: `${config.loteIdPrefix}${lote.id}`,
  }));
}


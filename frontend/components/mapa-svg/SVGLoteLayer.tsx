import React from 'react';
import type { LoteFeature } from '@/types/lote';
import { COLORES_ESTATUS, EstatusLote } from '@/types/lote';

interface FrontendConfigPath {
  id: string;
  d: string;
  interactive: boolean;
  transform?: string;
}

interface FrontendConfig {
  svgSource: string;
  viewBox?: string;
  paths: FrontendConfigPath[];
}

export interface SVGLoteLayerProps {
  lotes: LoteFeature[];
  onSelectLote: (lote: LoteFeature['properties']) => void;
  svgConfig: FrontendConfig;
  onHover?: (props: LoteFeature['properties'], e: React.MouseEvent<SVGPathElement>) => void;
  onHoverEnd?: () => void;
}

export const SVGLoteLayer = React.memo(function SVGLoteLayer({
  lotes,
  onSelectLote,
  svgConfig,
  onHover,
  onHoverEnd,
}: SVGLoteLayerProps) {
  const mapById = React.useMemo(() => {
    const m = new Map<string, LoteFeature['properties']>();
    for (const f of lotes) {
      if (f.properties?.numero_lote && f.properties?.manzana) {
        // Construct ID matching the official map format: M-{manzana}L-{lote}
        // DB stores numero_lote as "Manzana-Lote" (e.g. "29-8") due to unique constraint
        const manzana = String(f.properties.manzana).replace(/\D/g, '');

        let loteStr = String(f.properties.numero_lote);
        // If format is "29-8", extract "8"
        if (loteStr.includes('-')) {
          const parts = loteStr.split('-');
          loteStr = parts[parts.length - 1] || '';
        }
        const lote = loteStr.replace(/\D/g, '');

        const key = `M-${manzana}L-${lote}`;
        m.set(key, f.properties);
      }
    }
    return m;
  }, [lotes]);

  return (
    <g>
      {svgConfig.paths.map((pathConfig) => {
        const loteProps = mapById.get(pathConfig.id);
        const color = loteProps
          ? COLORES_ESTATUS[loteProps.estatus as EstatusLote] || '#94a3b8' // Fallback a gris azulado si estatus no coincide
          : 'rgba(255, 255, 255, 0.1)';

        const isMatch = !!loteProps;

        return (
          <path
            key={pathConfig.id}
            d={pathConfig.d}
            transform={pathConfig.transform}
            fill={pathConfig.interactive ? color : '#E2E8F0'} // Color terreno neutro para no interactivas
            fillOpacity={pathConfig.interactive && !isMatch ? 0.3 : 1}
            stroke={pathConfig.interactive ? '#FFFFFF' : 'none'}
            strokeWidth={1}
            data-path-id={pathConfig.id}
            onClick={() => {
              if (loteProps) onSelectLote(loteProps);
            }}
            onMouseEnter={(e) => {
              if (!isMatch) return;
              const el = e.currentTarget;
              // Efecto hover más sofisticado
              el.style.filter =
                'brightness(0.95) saturate(1.1) drop-shadow(0 2px 3px rgba(0,0,0,0.2))';
              el.style.zIndex = '10'; // Intentar traer al frente (nota: en SVG z-index depende del orden del DOM, esto podría no funcionar sin reordenar, pero filter ayuda)
              if (loteProps && onHover) onHover(loteProps, e);
            }}
            onMouseLeave={(e) => {
              if (!isMatch) return;
              const el = e.currentTarget;
              el.style.filter = 'none';
              el.style.zIndex = 'auto';
              if (onHoverEnd) onHoverEnd();
            }}
            style={{
              cursor: isMatch && pathConfig.interactive ? 'pointer' : 'default',
              transition: 'fill 0.3s ease, filter 0.2s ease',
              vectorEffect: 'non-scaling-stroke', // Mantiene el borde fino al hacer zoom
            }}
          />
        );
      })}
    </g>
  );
});

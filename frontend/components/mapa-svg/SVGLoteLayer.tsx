import React from 'react';
import type { LoteFeature } from '@/types/lote';
import { COLORES_ESTATUS, EstatusLote } from '@/types/lote';

interface FrontendConfigPath {
  id: string;
  d: string;
  interactive: boolean;
}

interface FrontendConfig {
  svgSource: string;
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
      if (f.properties?.numero_lote) {
        m.set(String(f.properties.numero_lote), f.properties);
      }
    }
    return m;
  }, [lotes]);

  return (
    <g>
      {svgConfig.paths.map((pathConfig) => {
        const loteProps = mapById.get(pathConfig.id);
        const color = loteProps
          ? COLORES_ESTATUS[loteProps.estatus as EstatusLote]
          : 'rgba(255, 255, 255, 0.1)'; // Color tenue para no coincidentes/filtrados

        const isMatch = !!loteProps;

        return (
          <path
            key={pathConfig.id}
            d={pathConfig.d}
            fill={pathConfig.interactive ? color : 'none'}
            stroke={isMatch ? color : 'rgba(255, 255, 255, 0.1)'}
            strokeWidth={0.6}
            data-path-id={pathConfig.id}
            onClick={() => {
              if (loteProps) onSelectLote(loteProps);
            }}
            onMouseEnter={(e) => {
              if (!isMatch) return;
              const el = e.currentTarget;
              el.setAttribute('opacity', '0.7');
              el.setAttribute('stroke', '#ffffff');
              if (loteProps && onHover) onHover(loteProps, e);
            }}
            onMouseLeave={(e) => {
              if (!isMatch) return;
              const el = e.currentTarget;
              el.removeAttribute('opacity');
              el.setAttribute('stroke', color);
              if (onHoverEnd) onHoverEnd();
            }}
            style={{ cursor: isMatch && pathConfig.interactive ? 'pointer' : 'default' }}
          />
        );
      })}
    </g>
  );
});

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
}

export function SVGLoteLayer({ lotes, onSelectLote, svgConfig }: SVGLoteLayerProps) {
  const handleClick = (props: LoteFeature['properties']) => {
    onSelectLote(props);
  };

  return (
    <g>
      {svgConfig.paths.map((pathConfig) => {
        const loteProps = lotes[0]?.properties;
        const fill = loteProps
          ? COLORES_ESTATUS[loteProps.estatus as EstatusLote]
          : '#10B981';

        return (
          <path
            key={pathConfig.id}
            d={pathConfig.d}
            fill="none"
            stroke={fill}
            strokeWidth={0.5}
            data-path-id={pathConfig.id}
            onClick={() => {
              if (loteProps) {
                handleClick(loteProps);
              }
            }}
            style={{ cursor: pathConfig.interactive ? 'pointer' : 'default' }}
          />
        );
      })}
    </g>
  );
}

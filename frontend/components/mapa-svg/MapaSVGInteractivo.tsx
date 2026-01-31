'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LoteFeature, FiltrosMapa } from '@/types/lote';
import { fetchLotesAsGeoJSON } from '@/lib/directus-api';
import { Leyenda } from './Leyenda';
import { PanelLote } from './PanelLote';
import { ControlesMapa } from './ControlesMapa';
import { SVGLoteLayer } from './SVGLoteLayer';
import { FiltrosMapa as FiltrosMapaComponent } from './FiltrosMapa';
import { useMapa } from '@/hooks/useMapa';

export interface MapaSVGInteractivoProps {
  svgViewBox?: string;
  onLoteSeleccionado?: (lote: LoteFeature['properties']) => void;
  modoSeleccion?: boolean;
  panelFooter?: React.ReactNode | ((lote: LoteFeature['properties']) => React.ReactNode);
}

interface FrontendConfigPath {
  id: string;
  d: string;
  interactive: boolean;
}

interface FrontendConfig {
  svgSource: string;
  paths: FrontendConfigPath[];
}

export function MapaSVGInteractivo({ svgViewBox = '0 0 1000 1000', onLoteSeleccionado, modoSeleccion = false, panelFooter }: MapaSVGInteractivoProps) {
  const [lotes, setLotes] = useState<LoteFeature[]>([]);
  const [selectedLote, setSelectedLote] = useState<LoteFeature['properties'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [frontendConfig, setFrontendConfig] = useState<FrontendConfig | null>(null);
  const { scale, offset, actions, handlers } = useMapa();
  const [filtros, setFiltros] = useState<FiltrosMapa>({});
  const [hoverInfo, setHoverInfo] = useState<{ props: LoteFeature['properties']; x: number; y: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [geojson, configRes] = await Promise.all([
          fetchLotesAsGeoJSON(),
          fetch('/mapas/scripts/frontend-config.json'),
        ]);

        setLotes(geojson.features);

        if (!configRes.ok) {
          throw new Error('No se pudo cargar frontend-config.json');
        }

        const configJson = (await configRes.json()) as FrontendConfig;
        setFrontendConfig(configJson);

        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error cargando lotes o configuración SVG');
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleZoomIn = actions.zoomIn;
  const handleZoomOut = actions.zoomOut;
  const handleReset = actions.reset;
  const handleFullscreen = actions.fullscreen;

  const handleSelectLote = (lote: LoteFeature['properties']) => {
    setSelectedLote(lote);
    if (onLoteSeleccionado) {
      onLoteSeleccionado(lote);
    }
  };

  const renderPanelFooter = () => {
    if (typeof panelFooter === 'function') {
        return selectedLote ? panelFooter(selectedLote) : null;
    }
    if (panelFooter) return panelFooter;
    if (!selectedLote) return null;

    if (selectedLote.estatus === 'disponible') {
      return (
        <Link
          href={`/ventas/nueva?lote=${selectedLote.id}`}
          className="block w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-center rounded font-semibold transition-colors"
        >
          Apartar Lote
        </Link>
      );
    }

    return null;
  };

  

  

  return (
    <div className="relative w-full h-screen bg-slate-900 flex">
      <div className="relative flex-1 flex items-center justify-center">
        {frontendConfig && (
          <svg
            className="w-full h-full max-h-screen"
            viewBox={svgViewBox}
            preserveAspectRatio="xMidYMid meet"
            onPointerDown={handlers.onPointerDown}
            onPointerMove={handlers.onPointerMove}
            onPointerUp={handlers.onPointerUp}
          >
            <g transform={`translate(${offset.x} ${offset.y}) scale(${scale})`}>
              <SVGLoteLayer
                lotes={lotes.filter((f) => {
                  const estatusOk = !filtros.estatus || filtros.estatus.includes(f.properties.estatus as any);
                  const numeroOk =
                    !filtros.numero_lote ||
                    String(f.properties.numero_lote).toLowerCase().includes(String(filtros.numero_lote).toLowerCase());
                  return estatusOk && numeroOk;
                })}
                onSelectLote={handleSelectLote}
                svgConfig={frontendConfig}
                onHover={(props, e) => setHoverInfo({ props, x: e.clientX, y: e.clientY })}
                onHoverEnd={() => setHoverInfo(null)}
              />
            </g>
          </svg>
        )}

        <ControlesMapa
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
          onFullscreen={handleFullscreen}
        />

        {hoverInfo && (
          <div
            className="absolute bg-slate-800 text-slate-100 text-xs px-2 py-1 rounded border border-slate-700 pointer-events-none"
            style={{ left: hoverInfo.x + 8, top: hoverInfo.y + 8 }}
          >
            {hoverInfo.props.numero_lote} · {hoverInfo.props.zona}-{hoverInfo.props.manzana}
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center">
              <p className="text-slate-100 text-lg font-semibold">Cargando mapa SVG...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-3 rounded-lg shadow-xl z-10">
            <p className="font-bold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      <div className="w-80 border-l border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <Leyenda />
        <FiltrosMapaComponent filtros={filtros} onChange={setFiltros} />
        <PanelLote 
          selectedLote={selectedLote} 
          onClose={() => setSelectedLote(null)} 
          footer={renderPanelFooter()}
        />
      </div>
    </div>
  );
}

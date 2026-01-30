'use client';

import { useEffect, useState } from 'react';
import type { LoteFeature } from '@/types/lote';
import { fetchLotesAsGeoJSON } from '@/lib/directus-api';
import { Leyenda } from './Leyenda';
import { PanelLote } from './PanelLote';
import { ControlesMapa } from './ControlesMapa';
import { SVGLoteLayer } from './SVGLoteLayer';

export interface MapaSVGInteractivoProps {
  svgViewBox?: string;
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

export function MapaSVGInteractivo({ svgViewBox = '0 0 1000 1000' }: MapaSVGInteractivoProps) {
  const [lotes, setLotes] = useState<LoteFeature[]>([]);
  const [selectedLote, setSelectedLote] = useState<LoteFeature['properties'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [frontendConfig, setFrontendConfig] = useState<FrontendConfig | null>(null);

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

  return (
    <div className="relative w-full h-screen bg-slate-900 flex">
      <div className="relative flex-1 flex items-center justify-center">
        {frontendConfig && (
          <svg
            className="w-full h-full max-h-screen"
            viewBox={svgViewBox}
            preserveAspectRatio="xMidYMid meet"
          >
            <SVGLoteLayer
              lotes={lotes}
              onSelectLote={setSelectedLote}
              svgConfig={frontendConfig}
            />
          </svg>
        )}

        <ControlesMapa />

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
        <PanelLote selectedLote={selectedLote} onClose={() => setSelectedLote(null)} />
      </div>
    </div>
  );
}

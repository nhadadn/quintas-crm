'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { fetchLotesAsGeoJSON } from '@/lib/directus-api';
import { type LoteFeature, EstatusLote, COLORES_ESTATUS } from '@/types/lote';
import { type MapaConfig, type MapViewState } from '@/types/mapa';

interface MapState {
  loading: boolean;
  error: string | null;
  totalLotes: number;
}

export default function MapaInteractivo() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [state, setState] = useState<MapState>({
    loading: true,
    error: null,
    totalLotes: 0,
  });
  const [selectedLote, setSelectedLote] = useState<LoteFeature['properties'] | null>(null);

  useEffect(() => {
    // Verificar que el token está configurado
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
      console.error('❌ Token de Mapbox NO configurado');
      setState((prev) => ({
        ...prev,
        error: 'Token de Mapbox no configurado. Verifica tu archivo .env.local',
        loading: false,
      }));
      return;
    }

    console.log('✅ Token de Mapbox configurado');

    if (!mapContainer.current) {
      console.error('❌ mapContainer no encontrado');
      return;
    }

    // Evitar inicializar el mapa múltiples veces
    if (map.current) return;

    // Configurar token de Mapbox
    mapboxgl.accessToken = token;

    console.log('🗺️ Inicializando mapa Mapbox...');

    // Crear mapa
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: [-104.65, 24.0], // Coordenadas de Quintas de Otinapa
      zoom: 15,
      pitch: 45,
      bearing: 0,
    });

    // Agregar controles de navegación
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Cuando el mapa carga
    map.current.on('load', async () => {
      console.log('✅ Mapa Mapbox cargado');

      try {
        console.log('📍 Obteniendo lotes desde Directus...');

        // Obtener lotes como GeoJSON
        const geoJSON = await fetchLotesAsGeoJSON();

        console.log('📊 GeoJSON obtenido:', {
          type: geoJSON.type,
          features: geoJSON.features.length,
        });

        if (!geoJSON.features || geoJSON.features.length === 0) {
          console.warn('⚠️ No hay lotes para mostrar');
          setState((prev) => ({
            ...prev,
            error: 'No hay lotes disponibles para mostrar',
            loading: false,
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          totalLotes: geoJSON.features.length,
        }));

        // Agregar source de lotes
        console.log('📍 Agregando source "lotes" al mapa...');
        map.current!.addSource('lotes', {
          type: 'geojson',
          data: geoJSON,
        });

        // Capa de relleno
        console.log('🎨 Agregando capa de relleno...');
        map.current!.addLayer({
          id: 'lotes-fill',
          type: 'fill',
          source: 'lotes',
          paint: {
            'fill-color': [
              'match',
              ['get', 'estatus'],
              EstatusLote.DISPONIBLE,
              COLORES_ESTATUS[EstatusLote.DISPONIBLE],
              EstatusLote.APARTADO,
              COLORES_ESTATUS[EstatusLote.APARTADO],
              EstatusLote.VENDIDO,
              COLORES_ESTATUS[EstatusLote.VENDIDO],
              EstatusLote.LIQUIDADO,
              COLORES_ESTATUS[EstatusLote.LIQUIDADO],
              '#cccccc', // Default/fallback color
            ],
            'fill-opacity': 0.6,
          },
        });

        // Capa de bordes
        console.log('🎨 Agregando capa de bordes...');
        map.current!.addLayer({
          id: 'lotes-border',
          type: 'line',
          source: 'lotes',
          paint: {
            'line-color': '#ffffff',
            'line-width': 2,
          },
        });

        // Evento: Click en lote
        map.current!.on('click', 'lotes-fill', (e) => {
          if (e.features && e.features[0]) {
            const properties = e.features[0].properties as LoteFeature['properties'];
            console.log('📍 Lote seleccionado:', properties);
            setSelectedLote(properties);
          }
        });

        // Evento: Hover
        map.current!.on('mouseenter', 'lotes-fill', () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = 'pointer';
          }
        });

        map.current!.on('mouseleave', 'lotes-fill', () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = '';
          }
        });

        // Centrar mapa en los lotes
        console.log('📍 Centrando mapa en lotes...');
        const bounds = new mapboxgl.LngLatBounds();

        geoJSON.features.forEach((feature) => {
          if (feature.geometry) {
            if (feature.geometry.type === 'Polygon') {
              const coords = feature.geometry.coordinates[0];
              coords.forEach((coord) => {
                bounds.extend(coord as [number, number]);
              });
            } else if (feature.geometry.type === 'Point') {
              bounds.extend(feature.geometry.coordinates as [number, number]);
            }
          }
        });

        if (!bounds.isEmpty()) {
          map.current!.fitBounds(bounds, { padding: 50 });
        }

        console.log('✅ Mapa cargado exitosamente con', geoJSON.features.length, 'lotes');
        setState((prev) => ({
          ...prev,
          loading: false,
        }));
      } catch (error) {
        console.error('❌ Error cargando lotes:', error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Error desconocido al cargar lotes',
          loading: false,
        }));
      }
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-slate-900">
      {/* Mapa */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Loading */}
      {state.loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="bg-slate-800 p-8 rounded-xl shadow-2xl text-center border border-slate-700">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-slate-100 text-xl font-semibold">Cargando mapa...</p>
            <p className="text-slate-400 text-sm mt-2">Conectando con Directus...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {state.error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl z-50 max-w-md">
          <p className="font-bold text-lg">⚠️ Error</p>
          <p className="text-sm mt-1">{state.error}</p>
          <p className="text-xs mt-2 opacity-75">Abre la consola (F12) para más detalles</p>
        </div>
      )}

      {/* Contador de lotes */}
      {!state.loading && !state.error && (
        <div className="absolute top-4 left-4 bg-slate-800 rounded-lg shadow-xl p-4 z-10 border border-slate-700">
          <p className="text-sm font-semibold text-slate-300">
            Total de lotes:{' '}
            <span className="text-emerald-400 text-xl font-bold">{state.totalLotes}</span>
          </p>
        </div>
      )}

      {/* Leyenda */}
      {!state.loading && !state.error && (
        <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg shadow-xl p-4 z-10 border border-slate-700">
          <h3 className="font-bold text-slate-100 mb-3 text-lg">Leyenda</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-emerald-500 rounded shadow-sm" />
              <span className="text-sm text-slate-300">Disponible</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-amber-500 rounded shadow-sm" />
              <span className="text-sm text-slate-300">Apartado</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-red-500 rounded shadow-sm" />
              <span className="text-sm text-slate-300">Vendido</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-indigo-500 rounded shadow-sm" />
              <span className="text-sm text-slate-300">Liquidado</span>
            </div>
          </div>
        </div>
      )}

      {/* Panel de detalles */}
      {selectedLote && (
        <div className="absolute top-4 right-4 bg-slate-800 rounded-xl shadow-2xl p-6 w-96 max-h-[85vh] overflow-y-auto z-10 border border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-slate-100">Lote {selectedLote.numero_lote}</h2>
            <button
              onClick={() => setSelectedLote(null)}
              className="text-slate-400 hover:text-slate-200 text-3xl leading-none transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-400">Ubicación</p>
              <p className="font-semibold text-slate-100 text-lg">
                Zona {selectedLote.zona} - Manzana {selectedLote.manzana}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400 mb-2">Estado</p>
              <span
                className="inline-block px-4 py-2 rounded-full text-white text-sm font-bold shadow-lg"
                style={{
                  backgroundColor:
                    COLORES_ESTATUS[selectedLote.estatus as EstatusLote] || '#6b7280',
                }}
              >
                {selectedLote.estatus.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 p-3 rounded-lg">
                <p className="text-xs text-slate-400">Área</p>
                <p className="font-bold text-slate-100 text-lg">{selectedLote.area_m2} m²</p>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg">
                <p className="text-xs text-slate-400">Dimensiones</p>
                <p className="font-bold text-slate-100 text-lg">
                  {selectedLote.frente_m} × {selectedLote.fondo_m} m
                </p>
              </div>
            </div>

            <div className="bg-emerald-900/30 p-4 rounded-lg border border-emerald-700">
              <p className="text-sm text-emerald-300 mb-1">Precio</p>
              <p className="text-3xl font-bold text-emerald-400">
                ${selectedLote.precio_lista.toLocaleString('es-MX')}
              </p>
              <p className="text-sm text-emerald-300 mt-1">
                ${(selectedLote.precio_lista / selectedLote.area_m2).toFixed(2)} / m²
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">Topografía</p>
                <p className="font-semibold text-slate-100 capitalize">{selectedLote.topografia}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Vista</p>
                <p className="font-semibold text-slate-100 capitalize">{selectedLote.vista}</p>
              </div>
            </div>

            {selectedLote.notas && (
              <div className="bg-slate-900 p-3 rounded-lg">
                <p className="text-sm text-slate-400 mb-1">Notas</p>
                <p className="text-sm text-slate-300">{selectedLote.notas}</p>
              </div>
            )}
          </div>

          {selectedLote.estatus === EstatusLote.DISPONIBLE && (
            <button className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg">
              Apartar Lote
            </button>
          )}
        </div>
      )}
    </div>
  );
}

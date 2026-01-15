import type { LoteProperties } from './lote';

// 4. Type MapboxStyle para estilos de mapa
export type MapboxStyle = 
  | 'mapbox://styles/mapbox/satellite-v9'
  | 'mapbox://styles/mapbox/streets-v12'
  | 'mapbox://styles/mapbox/light-v11'
  | 'mapbox://styles/mapbox/dark-v11';

// 1. Interface MapaConfig para configuración del mapa
export interface MapaConfig {
  initialCenter: [number, number]; // [lng, lat]
  initialZoom: number;
  initialPitch: number;
  initialBearing: number;
  style: MapboxStyle;
  minZoom?: number;
  maxZoom?: number;
}

// 2. Interface MapViewState para estado del mapa
export interface MapViewState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  isLoaded: boolean;
  isMoving: boolean;
}

// 3. Interface SelectedLoteState para lote seleccionado
export interface SelectedLoteState {
  lote: LoteProperties | null;
  position: { x: number; y: number } | null; // Para mostrar popup/tooltip
  isLoading: boolean;
}

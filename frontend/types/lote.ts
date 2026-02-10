import type { Feature, FeatureCollection, Geometry } from 'geojson';

// 4. Enum EstatusLote para estatus válidos
export enum EstatusLote {
  DISPONIBLE = 'disponible',
  APARTADO = 'apartado',
  VENDIDO = 'vendido',
  LIQUIDADO = 'liquidado',
}

// 5. Type ColoresEstatus para mapeo de colores
export const COLORES_ESTATUS: Record<EstatusLote, string> = {
  [EstatusLote.DISPONIBLE]: '#6B8E23', // Verde Oliva (Cálido)
  [EstatusLote.APARTADO]: '#D69E2E', // Ocre/Dorado
  [EstatusLote.VENDIDO]: '#9B2C2C', // Rojo profundo/Vino
  [EstatusLote.LIQUIDADO]: '#2C5282', // Azul marino cálido
};

// 1. Interface Lote con todos los campos del endpoint
export interface Lote {
  id: number;
  numero_lote: string;
  zona: string;
  manzana: string;
  area_m2: number;
  frente_m: number;
  fondo_m: number;
  estatus: EstatusLote | string; // Permitir string para flexibilidad, pero preferir Enum
  precio_lista: number;
  topografia: string;
  vista: string;
  geometria: Geometry | null; // Puede venir como JSON parseado o string si no se ha procesado
  p_coordenadas?: any; // Soporte para campo alternativo
  latitud: number;
  longitud: number;
  cliente_id: number | null;
  vendedor_id: number | null;
  notas: string;
  created_at: string;
  updated_at: string;
}

// 2. Interface LoteGeoJSON para features del mapa
// Properties suele ser una versión plana de Lote sin la geometría redundante
export interface LoteProperties extends Omit<Lote, 'geometria' | 'p_coordenadas'> {
  // Campos calculados adicionales si fueran necesarios (ej: precio_m2)
  precio_m2?: number;
}

export type LoteFeature = Feature<Geometry, LoteProperties>;

export type LoteFeatureCollection = FeatureCollection<Geometry, LoteProperties>;

// 3. Interface FiltrosMapa para búsqueda
export interface FiltrosMapa {
  estatus?: EstatusLote[];
  zona?: string[];
  manzana?: string[];
  precioMin?: number;
  precioMax?: number;
  areaMin?: number;
  areaMax?: number;
  numero_lote?: string;
}

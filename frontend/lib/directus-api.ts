import axios from 'axios';
import type { AxiosError } from 'axios';
import proj4 from 'proj4';
import { 
  type LoteFeature, 
  type LoteFeatureCollection, 
  type Lote as LoteType, 
  type FiltrosMapa,
  EstatusLote 
} from '@/types/lote';

const DIRECTUS_BASE_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL && process.env.NEXT_PUBLIC_DIRECTUS_URL.length > 0
    ? process.env.NEXT_PUBLIC_DIRECTUS_URL
    : 'http://localhost:8055';

// ========================================
// CONFIGURACIÓN DE SISTEMAS DE COORDENADAS
// ========================================

// UTM Zone 13N (para Durango, México)
const UTM_ZONE_13N = '+proj=utm +zone=13 +datum=WGS84 +units=m +no_defs';
const WGS84 = '+proj=longlat +datum=WGS84 +no_defs';

/**
 * Convierte coordenadas UTM a Lat/Lng (WGS84)
 * @param utmX - Coordenada X en UTM (Este)
 * @param utmY - Coordenada Y en UTM (Norte)
 * @returns [lng, lat] en WGS84
 */
function convertUTMtoLatLng(utmX: number, utmY: number): [number, number] {
  try {
    // Convertir de UTM Zone 13N a WGS84
    const [lng, lat] = proj4(UTM_ZONE_13N, WGS84, [utmX, utmY]);
    
    console.log(`🔄 UTM (${utmX.toFixed(2)}, ${utmY.toFixed(2)}) → WGS84 (${lng.toFixed(6)}, ${lat.toFixed(6)})`);
    
    return [lng, lat];
  } catch (error) {
    console.error('❌ Error convirtiendo coordenadas UTM:', error);
    console.error(`   Coordenadas: X=${utmX}, Y=${utmY}`);
    return [0, 0];
  }
}

/**
 * Verifica si las coordenadas están en formato UTM
 * @param x - Coordenada X
 * @param y - Coordenada Y
 * @returns true si son coordenadas UTM
 */
function isUTMCoordinate(x: number, y: number): boolean {
  // Las coordenadas UTM son números muy grandes
  // Longitud WGS84: -180 a 180
  // Latitud WGS84: -90 a 90
  // UTM X (Este): típicamente 160,000 a 834,000
  // UTM Y (Norte): típicamente 0 a 10,000,000
  
  return Math.abs(x) > 180 || Math.abs(y) > 90;
}

// ========================================
// INTERFACES Y TIPOS
// ========================================

export interface DirectusMeta {
  total?: number;
  filter_count?: number;
}

export interface DirectusResponse<T> {
  data: T;
  meta?: DirectusMeta | null;
}

export interface Lote {
  id: number;
  numero_lote: string;
  zona: string;
  manzana: string;
  area_m2: number;
  frente_m: number;
  fondo_m: number;
  estatus: EstatusLote | string;
  precio_lista: number;
  topografia: string;
  vista: string;
  cliente_id: string | null;
  vendedor_id: string | null;
  notas: string;
  svg_path_id?: string;
  geometria?: unknown;
  p_coordenadas?: any;
  latitud?: number;
  longitud?: number;
}

export interface LoteFilters {
  estatus?: EstatusLote | string;
  zona?: string;
  manzana?: string;
  precioMin?: number;
  precioMax?: number;
  areaMin?: number;
  areaMax?: number;
}

// ========================================
// CLASES DE ERROR
// ========================================

class DirectusApiError extends Error {
  status?: number;
  originalError?: unknown;

  constructor(message: string, options?: { status?: number; originalError?: unknown }) {
    super(message);
    this.name = 'DirectusError';
    this.status = options?.status;
    this.originalError = options?.originalError;
  }
}

export class NetworkError extends DirectusApiError {
  constructor(message: string, options?: { originalError?: unknown }) {
    super(message, { ...options, status: 0 });
    this.name = 'NetworkError';
  }
}

export class NotFoundError extends DirectusApiError {
  constructor(message: string, options?: { status?: number; originalError?: unknown }) {
    super(message, options);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends DirectusApiError {
  constructor(message: string, options?: { originalError?: unknown }) {
    super(message, options);
    this.name = 'ValidationError';
  }
}

// ========================================
// CLIENTE AXIOS
// ========================================

export const directusClient = axios.create({
  baseURL: DIRECTUS_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ========================================
// FUNCIONES DE UTILIDAD
// ========================================

export function handleAxiosError(error: unknown, context: string): never {
  const axiosError = error as AxiosError;

  if (!axios.isAxiosError(axiosError)) {
    console.error(`❌ Error inesperado en Directus (${context}):`, error);
    throw new DirectusApiError('Error inesperado al comunicarse con Directus', {
      originalError: error,
    });
  }

  const status = axiosError.response?.status;

  console.error(
    `❌ Error en petición a Directus (${context})`,
    status,
    axiosError.message,
    axiosError.response?.data,
  );

  if (!axiosError.response) {
    throw new NetworkError('Error de conexión con Directus', {
      originalError: axiosError,
    });
  }

  if (status === 404) {
    throw new NotFoundError('Recurso no encontrado en Directus', {
      status,
      originalError: axiosError,
    });
  }

  if (status === 400) {
    throw new ValidationError('Parámetros inválidos para la petición a Directus', {
      originalError: axiosError,
    });
  }

  throw new DirectusApiError('Error al comunicarse con Directus', {
    status,
    originalError: axiosError,
  });
}

function buildLotesFilterParams(filters: LoteFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {
    fields: '*',
    limit: -1,
  };

  if (filters.estatus) {
    params['filter[estatus][_eq]'] = filters.estatus;
  }
  if (filters.zona) {
    params['filter[zona][_eq]'] = filters.zona;
  }
  if (filters.manzana) {
    params['filter[manzana][_eq]'] = filters.manzana;
  }
  if (filters.precioMin !== undefined) {
    params['filter[precio_lista][_gte]'] = filters.precioMin;
  }
  if (filters.precioMax !== undefined) {
    params['filter[precio_lista][_lte]'] = filters.precioMax;
  }
  if (filters.areaMin !== undefined) {
    params['filter[area_m2][_gte]'] = filters.areaMin;
  }
  if (filters.areaMax !== undefined) {
    params['filter[area_m2][_lte]'] = filters.areaMax;
  }

  return params;
}

/**
 * Convierte un lote de Directus a un Feature de GeoJSON
 * Maneja automáticamente la conversión de coordenadas UTM a WGS84
 */
function loteToFeature(lote: Lote): LoteFeature | null {
  let geometry: any = null;

  // ========================================
  // PASO 1: Intentar obtener geometría de p_coordenadas
  // ========================================
  if (lote.p_coordenadas && lote.p_coordenadas.coordinates) {
    console.log(`📍 Lote ${lote.numero_lote}: Usando p_coordenadas`);
    
    geometry = {
      type: lote.p_coordenadas.type || 'Polygon',
      coordinates: lote.p_coordenadas.coordinates,
    };

    // Verificar si las coordenadas están en UTM
    if (geometry.type === 'Polygon' && geometry.coordinates && geometry.coordinates[0]) {
      const firstCoord = geometry.coordinates[0][0];
      
      if (Array.isArray(firstCoord) && firstCoord.length >= 2) {
        const [x, y] = firstCoord;
        
        if (isUTMCoordinate(x, y)) {
          console.log(`🔄 Lote ${lote.numero_lote}: Convirtiendo polígono de UTM a WGS84`);
          
          // Convertir cada punto del polígono
          geometry.coordinates[0] = geometry.coordinates[0].map((coord: number[]) => {
            return convertUTMtoLatLng(coord[0] || 0, coord[1] || 0);
          });
        }
      }
    } else if (geometry.type === 'Point' && geometry.coordinates) {
      const [x, y] = geometry.coordinates;
      
      if (isUTMCoordinate(x, y)) {
        console.log(`🔄 Lote ${lote.numero_lote}: Convirtiendo punto de UTM a WGS84`);
        geometry.coordinates = convertUTMtoLatLng(x, y);
      }
    }
  }
  
  // ========================================
  // PASO 2: Intentar obtener geometría de campo geometria
  // ========================================
  else if (lote.geometria) {
    console.log(`📍 Lote ${lote.numero_lote}: Usando geometria`);
    
    try {
      geometry =
        typeof lote.geometria === 'string' ? JSON.parse(lote.geometria as string) : lote.geometria;

      // Verificar si las coordenadas están en UTM
      if (geometry.type === 'Polygon' && geometry.coordinates && geometry.coordinates[0]) {
        const firstCoord = geometry.coordinates[0][0];
        
        if (Array.isArray(firstCoord) && firstCoord.length >= 2) {
          const [x, y] = firstCoord;
          
          if (isUTMCoordinate(x, y)) {
            console.log(`🔄 Lote ${lote.numero_lote}: Convirtiendo polígono de UTM a WGS84`);
            
            geometry.coordinates[0] = geometry.coordinates[0].map((coord: number[]) => {
              return convertUTMtoLatLng(coord[0] || 0, coord[1] || 0);
            });
          }
        }
      } else if (geometry.type === 'Point' && geometry.coordinates) {
        const [x, y] = geometry.coordinates;
        
        if (isUTMCoordinate(x, y)) {
          console.log(`🔄 Lote ${lote.numero_lote}: Convirtiendo punto de UTM a WGS84`);
          geometry.coordinates = convertUTMtoLatLng(x, y);
        }
      }
    } catch (e) {
      console.warn(`⚠️ Error parseando geometría del lote ${lote.id}`, e);
    }
  }

  // ========================================
  // PASO 3: Usar latitud/longitud como fallback
  // ========================================
  if (!geometry && lote.latitud !== undefined && lote.longitud !== undefined) {
    console.log(`📍 Lote ${lote.numero_lote}: Usando latitud/longitud`);
    
    let lng = lote.longitud;
    let lat = lote.latitud;

    // Verificar si son coordenadas UTM
    if (isUTMCoordinate(lng, lat)) {
      console.log(`🔄 Lote ${lote.numero_lote}: Convirtiendo punto de UTM a WGS84`);
      [lng, lat] = convertUTMtoLatLng(lng, lat);
    }

    geometry = {
      type: 'Point',
      coordinates: [lng, lat],
    };
  }

  // ========================================
  // PASO 4: Validar que tenemos geometría
  // ========================================
  if (!geometry) {
    console.warn(`⚠️ Lote ${lote.numero_lote} sin geometría válida`);
    return null;
  }

  // ========================================
  // PASO 5: Crear Feature de GeoJSON
  // ========================================
  const feature: LoteFeature = {
    type: 'Feature',
    id: lote.id,
    geometry: geometry as any, // Cast a any para evitar conflicto estricto de tipos Geometry
    properties: {
      id: lote.id,
      numero_lote: lote.numero_lote,
      zona: lote.zona,
      manzana: lote.manzana,
      area_m2: lote.area_m2,
      frente_m: lote.frente_m,
      fondo_m: lote.fondo_m,
      estatus: lote.estatus,
      precio_lista: lote.precio_lista,
      topografia: lote.topografia,
      vista: lote.vista,
      cliente_id: lote.cliente_id ? Number(lote.cliente_id) : null,
      vendedor_id: lote.vendedor_id ? Number(lote.vendedor_id) : null,
      notas: lote.notas,
      latitud: lote.latitud || 0,
      longitud: lote.longitud || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
  };

  return feature;
}

// ========================================
// FUNCIONES PÚBLICAS
// ========================================

export function convertToGeoJSON(input: DirectusResponse<Lote[]> | Lote[]): LoteFeatureCollection {
  const items = Array.isArray(input) ? input : input.data;

  console.log(`🔄 Convirtiendo ${items.length} lotes a GeoJSON...`);

  const features = items
    .map((lote) => loteToFeature(lote))
    .filter((feature): feature is LoteFeature => feature !== null);

  console.log(`✅ Convertidos ${features.length} lotes a GeoJSON`);

  return {
    type: 'FeatureCollection',
    features,
  };
}

export async function fetchAllLotes(): Promise<Lote[]> {
  try {
    console.log('📍 Obteniendo todos los lotes desde Directus');

    const response = await directusClient.get<DirectusResponse<Lote[]>>('/items/lotes', {
      params: {
        fields: '*',
        limit: -1,
      },
    });

    const items = response.data.data;
    console.log(`📊 Se obtuvieron ${items.length} lotes`);

    return items;
  } catch (error) {
    handleAxiosError(error, 'fetchAllLotes');
  }
}

export async function fetchLoteById(id: number | string): Promise<Lote> {
  if (id === null || id === undefined || id === '') {
    console.error('⚠️ ID inválido para fetchLoteById:', id);
    throw new ValidationError('El ID del lote es requerido');
  }

  try {
    console.log(`📍 Obteniendo lote con ID ${id}`);

    const response = await directusClient.get<DirectusResponse<Lote>>(`/items/lotes/${id}`);

    if (!response.data || !response.data.data) {
      throw new NotFoundError('Lote no encontrado');
    }

    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchLoteById');
  }
}

export async function fetchLotesFiltered(filters: LoteFilters = {}): Promise<Lote[]> {
  try {
    console.log('📍 Obteniendo lotes filtrados desde Directus', filters);

    const params = buildLotesFilterParams(filters);

    const response = await directusClient.get<DirectusResponse<Lote[]>>('/items/lotes', {
      params,
    });

    const items = response.data.data;
    console.log(`📊 Se obtuvieron ${items.length} lotes filtrados`);

    return items;
  } catch (error) {
    handleAxiosError(error, 'fetchLotesFiltered');
  }
}

export async function fetchLotesAsGeoJSON(filters?: LoteFilters): Promise<LoteFeatureCollection> {
  const lotes = filters ? await fetchLotesFiltered(filters) : await fetchAllLotes();
  return convertToGeoJSON(lotes);
}

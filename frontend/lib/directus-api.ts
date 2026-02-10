import axios from 'axios';
import type { AxiosError } from 'axios';
import { getSession } from 'next-auth/react';
import proj4 from 'proj4';
import {
  type LoteFeature,
  type LoteFeatureCollection,
  type Lote as LoteType,
  type FiltrosMapa,
  EstatusLote,
} from '@/types/lote';

const DIRECTUS_BASE_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL && process.env.NEXT_PUBLIC_DIRECTUS_URL.length > 0
    ? process.env.NEXT_PUBLIC_DIRECTUS_URL
    : 'http://localhost:8055'; // Fallback seguro para desarrollo

if (!process.env.NEXT_PUBLIC_DIRECTUS_URL) {
  console.warn(
    '⚠️ NEXT_PUBLIC_DIRECTUS_URL no está definido. Usando http://localhost:8055 por defecto.',
  );
}

const DIRECTUS_TOKEN = process.env.NEXT_PUBLIC_DIRECTUS_STATIC_TOKEN;

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

    // console.log(`🔄 UTM (${utmX.toFixed(2)}, ${utmY.toFixed(2)}) → WGS84 (${lng.toFixed(6)}, ${lat.toFixed(6)})`);

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

export class ForbiddenError extends DirectusApiError {
  constructor(message: string, options?: { originalError?: unknown }) {
    super(message, { ...options, status: 403 });
    this.name = 'ForbiddenError';
  }
}

export class UnauthorizedError extends DirectusApiError {
  constructor(message: string, options?: { originalError?: unknown }) {
    super(message, { ...options, status: 401 });
    this.name = 'UnauthorizedError';
  }
}

// ========================================
// CLIENTE AXIOS
// ========================================

// Cache simple en memoria para evitar recargas innecesarias
// Key: token + params, Value: { data, timestamp }
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const directusClient = axios.create({
  baseURL: DIRECTUS_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    ...(DIRECTUS_TOKEN ? { Authorization: `Bearer ${DIRECTUS_TOKEN}` } : {}),
  },
});

// Interceptor para logs de auditoría, depuración y reintentos
directusClient.interceptors.request.use(
  (config) => {
    // Metadata for timing
    (config as any).metadata = { startTime: new Date().getTime() };

    // Log Request Start
    console.log(`🚀 [Directus Request] ${config.method?.toUpperCase()} ${config.url}`);
    
    // Auth Validation Logging (Masked)
    if (config.headers.Authorization) {
      const authHeader = config.headers.Authorization as string;
      const maskedToken = authHeader.replace(/^Bearer\s+(.{4}).+(.{4})$/, 'Bearer $1...$2');
      console.log(`   🔑 Auth: ${maskedToken}`);
    } else {
      console.warn('   ⚠️ No Authorization header present');
    }

    if (process.env.NODE_ENV === 'development') {
      // console.log('   Headers:', JSON.stringify(config.headers));
    }
    return config;
  },
  (error) => {
    console.error('❌ [Directus Request Error]', error);
    return Promise.reject(error);
  }
);

directusClient.interceptors.response.use(
  (response) => {
    const startTime = (response.config as any).metadata?.startTime;
    const duration = startTime ? new Date().getTime() - startTime : '?';
    
    console.log(`✅ [Directus Response] ${response.status} ${response.config.url} (${duration}ms)`);
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as any;
    const startTime = config?.metadata?.startTime;
    const duration = startTime ? new Date().getTime() - startTime : '?';

    if (error.response) {
      console.error(
        `❌ [Directus Error ${error.response.status}] ${config?.method?.toUpperCase()} ${config?.url} (${duration}ms):`,
        JSON.stringify(error.response.data, null, 2)
      );

      // Manejo específico para 401 (Unauthorized)
      if (error.response.status === 401) {
        console.warn('⚠️ Credenciales inválidas o expiradas. Verifique su sesión.');
        console.warn('   Posibles causas: Token expirado, usuario deshabilitado, o credenciales incorrectas.');
        
        // Lógica de renovación de token (solo en cliente)
        if (!config._retry && typeof window !== 'undefined') {
          config._retry = true;
          try {
            console.log('🔄 Intentando renovar token automáticamente...');
            // getSession forzará una llamada al backend que actualizará el token si es posible
            const session = await getSession();
            
            if (session?.accessToken) {
              const newToken = session.accessToken;
              // Verificar si el token realmente cambió
              const oldAuth = config.headers['Authorization'] as string;
              const isSameToken = oldAuth && oldAuth.includes(newToken);
              
              if (!isSameToken) {
                console.log('✅ Token renovado exitosamente. Reintentando petición...');
                config.headers['Authorization'] = `Bearer ${newToken}`;
                return directusClient(config);
              } else {
                console.warn('⚠️ El token renovado es igual al anterior. Posible error de permisos o bucle.');
              }
            } else {
              console.warn('❌ No se pudo recuperar una sesión válida.');
            }
          } catch (refreshError) {
            console.error('❌ Error al intentar renovar la sesión:', refreshError);
          }
        }
      }
    } else if (error.request) {
      console.error(`❌ [Directus Network Error] ${config?.method?.toUpperCase()} ${config?.url} (${duration}ms) - No response received:`, error.message);
    } else {
      console.error('❌ [Directus Config Error]', error.message);
    }

    // Retry Logic (Exponential Backoff)
    if (!config || !config.retry) {
      config.retry = 0;
    }

    const MAX_RETRIES = 3;

    // Retry if network error or 5xx or 429
    // Do NOT retry 401 or 403 (auth errors should not be retried without new token)
    if (
      config.retry < MAX_RETRIES &&
      (!error.response || error.response.status >= 500 || error.response.status === 429)
    ) {
      config.retry += 1;
      const delay = Math.pow(2, config.retry) * 1000; // 2s, 4s, 8s

      console.log(`⚠️ Retrying request... (${config.retry}/${MAX_RETRIES}) in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      return directusClient(config);
    }

    return Promise.reject(error);
  }
);

export { directusClient };

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

  if (status === 403) {
    const errorData = axiosError.response?.data as any;
    const extensions = errorData?.errors?.[0]?.extensions;
    const message = errorData?.errors?.[0]?.message || 'Acceso denegado a recurso de Directus';

    console.error('🔒 403 Forbidden - Detalles:', {
      code: extensions?.code,
      collection: extensions?.collection,
      field: extensions?.field,
    });

    throw new ForbiddenError(message, {
      originalError: axiosError,
    });
  }

  if (status === 401) {
    const errorData = axiosError.response?.data as any;
    const message = errorData?.errors?.[0]?.message || 'No autorizado. Verifique sus credenciales.';
    
    console.warn(`🔒 401 Unauthorized - ${message}`);

    throw new UnauthorizedError(message, {
      originalError: axiosError,
    });
  }

  if (status === 400) {
    const errorData = axiosError.response?.data as any;
    const directusErrors = errorData?.errors;
    let message = 'Parámetros inválidos para la petición a Directus';

    if (Array.isArray(directusErrors) && directusErrors.length > 0) {
      message = directusErrors.map((e: any) => e.message).join('; ');
    }

    throw new ValidationError(message, {
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
      updated_at: new Date().toISOString(),
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

export async function fetchAllLotes(token?: string): Promise<Lote[]> {
  try {
    console.log('📍 Obteniendo todos los lotes desde Directus');

    if (!token) {
      console.warn('⚠️ fetchAllLotes llamado sin token. Esto puede fallar si el endpoint requiere autenticación.');
    }

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await directusClient.get<DirectusResponse<Lote[]>>('/items/lotes', {
      params: {
        fields: '*',
        limit: -1,
      },
      headers,
    });

    const items = response.data.data;
    console.log(`📊 Se obtuvieron ${items.length} lotes`);

    return items;
  } catch (error) {
    console.error('❌ Error en fetchAllLotes:', error);
    handleAxiosError(error, 'fetchAllLotes');
  }
}

export async function fetchLoteById(id: number | string, token?: string): Promise<Lote> {
  if (id === null || id === undefined || id === '') {
    console.error('⚠️ ID inválido para fetchLoteById:', id);
    throw new ValidationError('El ID del lote es requerido');
  }

  try {
    console.log(`📍 Obteniendo lote con ID ${id}`);

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await directusClient.get<DirectusResponse<Lote>>(`/items/lotes/${id}`, {
      headers,
    });

    if (!response.data || !response.data.data) {
      throw new NotFoundError('Lote no encontrado');
    }

    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchLoteById');
  }
}

export async function fetchLotesFiltered(
  filters: LoteFilters = {},
  token?: string,
): Promise<Lote[]> {
  try {
    console.log('📍 Obteniendo lotes filtrados desde Directus', filters);

    const params = buildLotesFilterParams(filters);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await directusClient.get<DirectusResponse<Lote[]>>('/items/lotes', {
      params,
      headers,
    });

    const items = response.data.data;
    console.log(`📊 Se obtuvieron ${items.length} lotes filtrados`);

    return items;
  } catch (error) {
    handleAxiosError(error, 'fetchLotesFiltered');
  }
}

export async function fetchLotesAsGeoJSON(
  filters?: LoteFilters,
  token?: string,
): Promise<LoteFeatureCollection> {
  // Intentar usar el endpoint optimizado /mapa-lotes
  try {
    console.log('📍 Obteniendo GeoJSON desde /mapa-lotes');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const params = buildLotesFilterParams(filters || {});

    const response = await directusClient.get<LoteFeatureCollection>('/mapa-lotes', {
      headers,
      params,
    });

    const geoJSON = response.data;

    // Aplicar filtros en el cliente si es necesario
    if (filters && geoJSON.features) {
      console.log('🔍 Aplicando filtros en cliente al GeoJSON recibido');
      const filteredFeatures = geoJSON.features.filter((feature) => {
        const props = feature.properties;

        if (filters.estatus && props.estatus !== filters.estatus) return false;
        if (filters.zona && props.zona !== filters.zona) return false;
        if (filters.manzana && props.manzana !== filters.manzana) return false;
        if (filters.precioMin !== undefined && props.precio_lista < filters.precioMin) return false;
        if (filters.precioMax !== undefined && props.precio_lista > filters.precioMax) return false;
        if (filters.areaMin !== undefined && props.area_m2 < filters.areaMin) return false;
        if (filters.areaMax !== undefined && props.area_m2 > filters.areaMax) return false;

        return true;
      });

      geoJSON.features = filteredFeatures;
      console.log(`✅ ${filteredFeatures.length} lotes después de filtrar`);
    }

    return geoJSON;
  } catch (error) {
    // Manejo inteligente de errores para /mapa-lotes
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      
      // Si falla por autenticación con token, intentar sin token (endpoint público)
      if ((status === 401 || status === 403) && token) {
        console.warn('⚠️ Error de autenticación en /mapa-lotes con token, reintentando acceso público...');
        try {
          // IMPORTANTE: Aseguramos no enviar el header Authorization en el reintento
          // Creamos una instancia limpia de axios para evitar interceptores que inyecten el token
          const publicResponse = await axios.get(`${DIRECTUS_URL}/mapa-lotes`, {
            params: buildLotesFilterParams(filters || {}),
          });
          return publicResponse.data;
        } catch (retryError) {
          console.error('❌ Falló reintento público a /mapa-lotes', retryError);
          // Si falla el público, intentar fallback a items/lotes
          console.warn('⚠️ Intentando fallback a /items/lotes tras fallo público');
          const lotes = filters ? await fetchLotesFiltered(filters, token) : await fetchAllLotes(token);
          return convertToGeoJSON(lotes);
        }
      }

      // Si el endpoint no existe (404), usar fallback
      if (status === 404) {
        console.warn('⚠️ Endpoint /mapa-lotes no encontrado (404), usando fallback a /items/lotes');
        const lotes = filters ? await fetchLotesFiltered(filters, token) : await fetchAllLotes(token);
        return convertToGeoJSON(lotes);
      }
    }

    console.error('❌ Error crítico consumiendo /mapa-lotes', error);
    // En caso de otros errores, intentar fallback como última opción
    console.warn('⚠️ Intentando fallback a /items/lotes tras error desconocido');
    const lotes = filters ? await fetchLotesFiltered(filters, token) : await fetchAllLotes(token);
    return convertToGeoJSON(lotes);
  }
}

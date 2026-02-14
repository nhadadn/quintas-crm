import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import axios from 'axios';
import { 
  convertToGeoJSON, 
  fetchLotesAsGeoJSON,
  fetchAllLotes,
  fetchLoteById,
  fetchLotesFiltered,
  type Lote,
  type LoteFeatureCollection,
  ValidationError,
  NotFoundError,
  handleAxiosError,
  NetworkError,
  ForbiddenError,
  UnauthorizedError
} from '@/lib/directus-api';
import { getSession } from 'next-auth/react';

// Mock proj4
vi.mock('proj4', () => {
  return {
    default: vi.fn((from, to, coords) => {
      if (Array.isArray(coords) && coords[0] === 999999) {
        throw new Error('Proj4 Error');
      }
      // Return a valid WGS84 coordinate for test purposes
      return [-104.99, 25.0];
    }),
  };
});

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  getSession: vi.fn(),
}));

// Mock axios
vi.mock('axios', () => {
  const mockClient: any = vi.fn(() => Promise.resolve({ data: {} }));
  mockClient.get = vi.fn();
  mockClient.interceptors = {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  };
  return {
    default: {
      create: vi.fn(() => mockClient),
      get: vi.fn(), // For the fallback call
      isAxiosError: vi.fn((payload) => !!payload?.isAxiosError),
    },
  };
});

describe('Directus API Coverage', () => {
  // Get the mocked client instance
  // Note: Since we mocked axios.create to return mockClient, directusClient (imported from lib)
  // will be using this mockClient.
  const mockClient = (axios.create as any)(); 
  
  // Capture interceptors immediately (before any beforeEach clears them)
  let capturedReqInterceptor: any, capturedReqErrorInterceptor: any;
  let capturedResInterceptor: any, capturedResErrorInterceptor: any;

  const reqCalls = mockClient.interceptors.request.use.mock.calls;
  const resCalls = mockClient.interceptors.response.use.mock.calls;
  
  if (reqCalls.length > 0) {
    [capturedReqInterceptor, capturedReqErrorInterceptor] = reqCalls[0];
  }
  if (resCalls.length > 0) {
    [capturedResInterceptor, capturedResErrorInterceptor] = resCalls[0];
  }
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleAxiosError Edge Cases', () => {
      it('should use default message for 403 if no details provided', () => {
        const error = { 
          isAxiosError: true, 
          response: { 
            status: 403, 
            data: {} // No errors array
          } 
        };
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        expect(() => handleAxiosError(error, 'test')).toThrow('Acceso denegado a recurso de Directus');
        
        consoleErrorSpy.mockRestore();
      });

      it('should use default message for 401 if no details provided', () => {
        const error = { 
          isAxiosError: true, 
          response: { 
            status: 401, 
            data: {} // No errors array
          } 
        };
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        expect(() => handleAxiosError(error, 'test')).toThrow('No autorizado. Verifique sus credenciales.');
        
        consoleWarnSpy.mockRestore();
      });

      it('should use default message for 400 if errors array is empty', () => {
        const error = { 
          isAxiosError: true, 
          response: { 
            status: 400, 
            data: { errors: [] } // Empty errors array
          } 
        };
        
        expect(() => handleAxiosError(error, 'test')).toThrow('Parámetros inválidos para la petición a Directus');
      });
    });

  describe('convertToGeoJSON', () => {
    it('should convert Lote with p_coordenadas (Polygon) correctly', () => {
      const lote: Lote = {
        id: 1,
        numero_lote: 'L-001',
        zona: 'A',
        manzana: '1',
        area_m2: 100,
        frente_m: 10,
        fondo_m: 10,
        estatus: 'disponible',
        precio_lista: 100000,
        topografia: 'plana',
        vista: 'norte',
        cliente_id: null,
        vendedor_id: null,
        notas: '',
        p_coordenadas: {
          type: 'Polygon',
          coordinates: [[[ -100, 20 ], [ -101, 21 ], [ -100, 20 ]]] // WGS84
        }
      };
      
      const geoJSON = convertToGeoJSON([lote]);
      expect(geoJSON.features).toHaveLength(1);
      expect(geoJSON.features[0].geometry.type).toBe('Polygon');
      expect(geoJSON.features[0].geometry.coordinates).toEqual(lote.p_coordenadas.coordinates);
    });

    it('should convert Lote with UTM coordinates in p_coordenadas', () => {
      // UTM Zone 13N approx coords
      const utmX = 500000;
      const utmY = 2800000;
      
      const lote: Lote = {
        id: 2,
        numero_lote: 'L-002',
        zona: 'B',
        manzana: '2',
        area_m2: 200,
        frente_m: 20,
        fondo_m: 10,
        estatus: 'vendido',
        precio_lista: 200000,
        topografia: 'irregular',
        vista: 'sur',
        cliente_id: '123',
        vendedor_id: '456',
        notas: '',
        p_coordenadas: {
          type: 'Point',
          coordinates: [utmX, utmY] // UTM
        }
      };

      const geoJSON = convertToGeoJSON([lote]);
      expect(geoJSON.features).toHaveLength(1);
      expect(geoJSON.features[0].geometry.type).toBe('Point');
      // Should be converted to WGS84 (Lat/Lng are small numbers)
      const [lng, lat] = geoJSON.features[0].geometry.coordinates as number[];
      expect(Math.abs(lng)).toBeLessThan(180);
    });

    it('should fallback to latitud/longitud if no geometry', () => {
      const lote: Lote = {
        id: 3,
        numero_lote: 'L-003',
        zona: 'C',
        manzana: '3',
        area_m2: 300,
        frente_m: 30,
        fondo_m: 10,
        estatus: 'apartado',
        precio_lista: 300000,
        topografia: 'plana',
        vista: 'este',
        cliente_id: null,
        vendedor_id: null,
        notas: '',
        latitud: 25.0,
        longitud: -105.0
      };

      const geoJSON = convertToGeoJSON([lote]);
      expect(geoJSON.features).toHaveLength(1);
      expect(geoJSON.features[0].geometry.type).toBe('Point');
      expect(geoJSON.features[0].geometry.coordinates).toEqual([-105.0, 25.0]);
    });

    it('should convert Lote with latitud/longitud (UTM) when p_coordenadas is missing', () => {
      const utmX = 500000;
      const utmY = 2800000;
      
      const lote: Lote = {
        id: 3,
        numero_lote: 'L-003',
        zona: 'C',
        manzana: '3',
        area_m2: 300,
        frente_m: 15,
        fondo_m: 20,
        estatus: 'apartado',
        precio_lista: 300000,
        topografia: 'plana',
        vista: 'este',
        cliente_id: null,
        vendedor_id: null,
        notas: '',
        latitud: utmY,
        longitud: utmX
      };

      const geoJSON = convertToGeoJSON([lote]);
      expect(geoJSON.features).toHaveLength(1);
      expect(geoJSON.features[0].geometry.type).toBe('Point');
      const [lng, lat] = geoJSON.features[0].geometry.coordinates as number[];
      expect(Math.abs(lng)).toBeLessThan(180);
      expect(Math.abs(lat)).toBeLessThan(90);
    });

    it('should skip Lote without valid geometry', () => {
      const lote: Lote = {
        id: 4,
        numero_lote: 'L-004',
        zona: 'D',
        manzana: '4',
        area_m2: 400,
        frente_m: 20,
        fondo_m: 20,
        estatus: 'disponible',
        precio_lista: 400000,
        topografia: 'plana',
        vista: 'oeste',
        cliente_id: null,
        vendedor_id: null,
        notas: ''
      };

      const geoJSON = convertToGeoJSON([lote]);
      expect(geoJSON.features).toHaveLength(0);
    });

    it('should convert Lote with geometria field (JSON string)', () => {
      const geometry = {
        type: 'Point',
        coordinates: [-100.0, 20.0]
      };
      
      const lote: Lote = {
        id: 5,
        numero_lote: 'L-005',
        zona: 'E',
        manzana: '5',
        area_m2: 500,
        frente_m: 20,
        fondo_m: 25,
        estatus: 'disponible',
        precio_lista: 500000,
        topografia: 'plana',
        vista: 'norte',
        cliente_id: null,
        vendedor_id: null,
        notas: '',
        geometria: JSON.stringify(geometry)
      };

      const geoJSON = convertToGeoJSON([lote]);
      expect(geoJSON.features).toHaveLength(1);
      expect(geoJSON.features[0].geometry).toEqual(geometry);
    });

    it('should convert Lote with geometria field (Object)', () => {
      const geometry = {
        type: 'Point',
        coordinates: [-100.0, 20.0]
      };
      
      const lote: Lote = {
        id: 6,
        numero_lote: 'L-006',
        zona: 'F',
        manzana: '6',
        area_m2: 600,
        frente_m: 20,
        fondo_m: 30,
        estatus: 'disponible',
        precio_lista: 600000,
        topografia: 'plana',
        vista: 'sur',
        cliente_id: null,
        vendedor_id: null,
        notas: '',
        geometria: geometry
      };

      const geoJSON = convertToGeoJSON([lote]);
      expect(geoJSON.features).toHaveLength(1);
      expect(geoJSON.features[0].geometry).toEqual(geometry);
    });

    it('should handle invalid JSON in geometria field gracefully', () => {
      const lote: Lote = {
        id: 7,
        numero_lote: 'L-007',
        zona: 'G',
        manzana: '7',
        area_m2: 700,
        frente_m: 20,
        fondo_m: 35,
        estatus: 'disponible',
        precio_lista: 700000,
        topografia: 'plana',
        vista: 'este',
        cliente_id: null,
        vendedor_id: null,
        notas: '',
        geometria: 'invalid-json'
      };

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const geoJSON = convertToGeoJSON([lote]);
      
      expect(geoJSON.features).toHaveLength(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Error parseando geometría'), expect.any(Error));
      consoleWarnSpy.mockRestore();
    });

    it('should convert Lote with geometria (UTM Polygon)', () => {
      const utmX = 500000;
      const utmY = 2800000;
      const geometry = {
        type: 'Polygon',
        coordinates: [[[utmX, utmY], [utmX+10, utmY], [utmX+10, utmY+10], [utmX, utmY+10], [utmX, utmY]]]
      };
      
      const lote: Lote = {
        id: 8,
        numero_lote: 'L-008',
        zona: 'H',
        manzana: '8',
        area_m2: 800,
        frente_m: 20,
        fondo_m: 40,
        estatus: 'disponible',
        precio_lista: 800000,
        topografia: 'plana',
        vista: 'oeste',
        cliente_id: null,
        vendedor_id: null,
        notas: '',
        geometria: geometry
      };

      const geoJSON = convertToGeoJSON([lote]);
      expect(geoJSON.features).toHaveLength(1);
      // @ts-ignore
      const coords = geoJSON.features[0].geometry.coordinates[0];
      expect(coords[0][0]).toBeLessThan(180); // Converted to WGS84
    });

    it('should convert Lote with p_coordenadas (UTM Polygon)', () => {
      const utmX = 500000;
      const utmY = 2800000;
      const lote: Lote = {
        id: 9,
        numero_lote: 'L-009',
        zona: 'I',
        manzana: '9',
        area_m2: 900,
        frente_m: 20,
        fondo_m: 45,
        estatus: 'disponible',
        precio_lista: 900000,
        topografia: 'plana',
        vista: 'sur',
        cliente_id: null,
        vendedor_id: null,
        notas: '',
        p_coordenadas: {
          type: 'Polygon',
          coordinates: [[[utmX, utmY], [utmX+10, utmY], [utmX+10, utmY+10], [utmX, utmY+10], [utmX, utmY]]]
        }
      };

      const geoJSON = convertToGeoJSON([lote]);
      expect(geoJSON.features).toHaveLength(1);
      // @ts-ignore
      const coords = geoJSON.features[0].geometry.coordinates[0];
      expect(coords[0][0]).toBeLessThan(180); // Converted to WGS84
    });

    it('should convert Lote with geometria (UTM Point)', () => {
      const utmX = 500000;
      const utmY = 2800000;
      const geometry = {
        type: 'Point',
        coordinates: [utmX, utmY]
      };
      
      const lote: Lote = {
        id: 10,
        numero_lote: 'L-010',
        zona: 'J',
        manzana: '10',
        area_m2: 1000,
        frente_m: 20,
        fondo_m: 50,
        estatus: 'disponible',
        precio_lista: 1000000,
        topografia: 'plana',
        vista: 'norte',
        cliente_id: null,
        vendedor_id: null,
        notas: '',
        geometria: geometry
      };

      const geoJSON = convertToGeoJSON([lote]);
      expect(geoJSON.features).toHaveLength(1);
      const [lng, lat] = geoJSON.features[0].geometry.coordinates as number[];
      expect(Math.abs(lng)).toBeLessThan(180);
    });

    it('should handle error in UTM conversion gracefully', () => {
      const utmX = 999999; // Trigger error in mock
      const utmY = 2800000;
      
      const lote: Lote = {
        id: 11,
        numero_lote: 'L-011',
        zona: 'K',
        manzana: '11',
        area_m2: 1100,
        frente_m: 20,
        fondo_m: 55,
        estatus: 'disponible',
        precio_lista: 1100000,
        topografia: 'plana',
        vista: 'sur',
        cliente_id: null,
        vendedor_id: null,
        notas: '',
        p_coordenadas: {
          type: 'Point',
          coordinates: [utmX, utmY]
        }
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const geoJSON = convertToGeoJSON([lote]);
      
      expect(geoJSON.features).toHaveLength(1);
      expect(geoJSON.features[0].geometry.coordinates).toEqual([0, 0]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error convirtiendo coordenadas UTM'), expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    it('should identify and convert coordinates just above WGS84 limits', () => {
      const x = 181; // Just above 180, triggers UTM check
      const y = 0;
      
      const lote: Lote = {
        id: 12,
        numero_lote: 'L-012',
        zona: 'L',
        manzana: '12',
        area_m2: 1200,
        frente_m: 20,
        fondo_m: 60,
        estatus: 'disponible',
        precio_lista: 1200000,
        topografia: 'plana',
        vista: 'norte',
        cliente_id: null,
        vendedor_id: null,
        notas: '',
        p_coordenadas: {
          type: 'Point',
          coordinates: [x, y]
        }
      };

      const geoJSON = convertToGeoJSON([lote]);
      expect(geoJSON.features).toHaveLength(1);
      // Mock returns [-104.99, 25.0], proving conversion was called
      expect(geoJSON.features[0].geometry.coordinates).toEqual([-104.99, 25.0]);
    });

    it('should return null if p_coordenadas has no coordinates', () => {
        const lote: Lote = {
          id: 13,
          numero_lote: 'L-013',
          zona: 'M',
          manzana: '13',
          area_m2: 1300,
          frente_m: 20,
          fondo_m: 65,
          estatus: 'disponible',
          precio_lista: 1300000,
          topografia: 'plana',
          vista: 'norte',
          cliente_id: null,
          vendedor_id: null,
          notas: '',
          p_coordenadas: { type: 'Point' } // Missing coordinates
        };
        const geoJSON = convertToGeoJSON([lote]);
        expect(geoJSON.features).toHaveLength(0);
    });


  });

  describe('fetchLotesAsGeoJSON', () => {
    it('should use /mapa-lotes endpoint first', async () => {
      const mockGeoJSON: LoteFeatureCollection = {
        type: 'FeatureCollection',
        features: []
      };
      
      mockClient.get.mockResolvedValueOnce({ data: mockGeoJSON });
      
      const result = await fetchLotesAsGeoJSON();
      
      expect(mockClient.get).toHaveBeenCalledWith('/mapa-lotes', expect.any(Object));
      expect(result).toEqual(mockGeoJSON);
    });

    it('should fallback to public endpoint on 401/403 with token', async () => {
      // First call fails with 401
      mockClient.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 401 }
      });

      // Second call (public fallback) succeeds
      const mockGeoJSON: LoteFeatureCollection = {
        type: 'FeatureCollection',
        features: []
      };
      (axios.get as any).mockResolvedValueOnce({ data: mockGeoJSON });

      const result = await fetchLotesAsGeoJSON({}, 'fake-token');

      expect(mockClient.get).toHaveBeenCalledWith('/mapa-lotes', expect.objectContaining({
        headers: { Authorization: 'Bearer fake-token' }
      }));
      
      // Should call public axios.get (not the client instance)
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/mapa-lotes'), expect.any(Object));
      expect(result).toEqual(mockGeoJSON);
    });

    it('should fallback to /items/lotes on 404', async () => {
       // First call fails with 404
      mockClient.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 404 }
      });

      // Second call (items/lotes) succeeds
      const mockLotes: Lote[] = [{
        id: 4,
        numero_lote: 'L-004',
        zona: 'D',
        manzana: '4',
        area_m2: 400,
        frente_m: 40,
        fondo_m: 10,
        estatus: 'disponible',
        precio_lista: 400000,
        topografia: 'plana',
        vista: 'oeste',
        cliente_id: null,
        vendedor_id: null,
        notas: '',
        latitud: 26.0,
        longitud: -106.0
      }];
      
      // Mock the fallback call which uses fetchAllLotes/fetchLotesFiltered
      // These functions use directusClient.get('/items/lotes', ...)
      mockClient.get.mockResolvedValueOnce({ 
        data: { data: mockLotes } 
      });

      const result = await fetchLotesAsGeoJSON();

      // First call was to /mapa-lotes
      expect(mockClient.get).toHaveBeenNthCalledWith(1, '/mapa-lotes', expect.any(Object));
      
      // Second call was to /items/lotes
      expect(mockClient.get).toHaveBeenNthCalledWith(2, '/items/lotes', expect.any(Object));
      
      expect(result.features).toHaveLength(1);
      expect(result.features[0].properties.numero_lote).toBe('L-004');
    });

    it('should apply client-side filters', async () => {
      const mockGeoJSON: LoteFeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: 1,
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: {
              id: 1,
              numero_lote: 'L-1',
              zona: 'A',
              manzana: '1',
              area_m2: 100,
              frente_m: 10,
              fondo_m: 10,
              estatus: 'disponible',
              precio_lista: 100000,
              topografia: 'plana',
              vista: 'norte',
              cliente_id: null,
              vendedor_id: null,
              notas: '',
              latitud: 0,
              longitud: 0,
              created_at: '',
              updated_at: ''
            }
          },
          {
            type: 'Feature',
            id: 2,
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: {
              id: 2,
              numero_lote: 'L-2',
              zona: 'B',
              manzana: '1',
              area_m2: 100,
              frente_m: 10,
              fondo_m: 10,
              estatus: 'vendido',
              precio_lista: 100000,
              topografia: 'plana',
              vista: 'norte',
              cliente_id: null,
              vendedor_id: null,
              notas: '',
              latitud: 0,
              longitud: 0,
              created_at: '',
              updated_at: ''
            }
          }
        ]
      };
      
      mockClient.get.mockResolvedValueOnce({ data: mockGeoJSON });
      
      // Filter by zona 'A'
      const result = await fetchLotesAsGeoJSON({ zona: 'A' });
      
      expect(result.features).toHaveLength(1);
      expect(result.features[0].properties.zona).toBe('A');
    });

    it('should fallback to /items/lotes after public endpoint failure', async () => {
      // 1. Auth call fails with 401
      mockClient.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 401 }
      });

      // 2. Public call fails with 500
      (axios.get as any).mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 500 }
      });

      // 3. Fallback to /items/lotes succeeds
      const mockLotes: Lote[] = [{
        id: 5,
        numero_lote: 'L-005',
        zona: 'E',
        manzana: '5',
        area_m2: 500,
        frente_m: 50,
        fondo_m: 10,
        estatus: 'disponible',
        precio_lista: 500000,
        topografia: 'plana',
        vista: 'este',
        cliente_id: null,
        vendedor_id: null,
        notas: '',
        latitud: 0,
        longitud: 0
      }];
      
      mockClient.get.mockResolvedValueOnce({ 
        data: { data: mockLotes } 
      });

      const result = await fetchLotesAsGeoJSON({}, 'token');

      expect(mockClient.get).toHaveBeenNthCalledWith(1, '/mapa-lotes', expect.any(Object));
      expect(axios.get).toHaveBeenCalled(); // Public call
      expect(mockClient.get).toHaveBeenNthCalledWith(2, '/items/lotes', expect.any(Object));
      
      expect(result.features).toHaveLength(1);
      expect(result.features[0].properties.numero_lote).toBe('L-005');
    });

    it('should fallback to /items/lotes on non-axios error', async () => {
      // First call fails with generic error
      mockClient.get.mockRejectedValueOnce(new Error('Unknown error'));

      // Fallback succeeds
      const mockLotes: Lote[] = [];
      mockClient.get.mockResolvedValueOnce({ data: { data: mockLotes } });

      const result = await fetchLotesAsGeoJSON();

      expect(mockClient.get).toHaveBeenNthCalledWith(1, '/mapa-lotes', expect.any(Object));
      expect(mockClient.get).toHaveBeenNthCalledWith(2, '/items/lotes', expect.any(Object));
      expect(result.features).toHaveLength(0);
    });

    it('should fallback to fetchLotesFiltered when public retry fails', async () => {
       // Mock initial /mapa-lotes failure (401)
       const mockClient = (axios.create as any)();
       mockClient.get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } });
       
       // Mock public retry failure
       (axios.get as any).mockRejectedValueOnce(new Error('Public retry failed'));
       
       // Mock fallback fetchLotesFiltered (since we pass filters)
       mockClient.get.mockResolvedValueOnce({ data: { data: [] } }); 
       
       const filters = { estatus: 'disponible' };
       const result = await fetchLotesAsGeoJSON(filters, 'token');
       
       expect(result.features).toEqual([]);
       // Verify public retry was called
       expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/mapa-lotes'), expect.anything());
    });
    
    it('should apply all client-side filters', async () => {
      const mockGeoJSON: LoteFeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: 1,
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: {
              id: 1,
              numero_lote: 'L-1',
              zona: 'A',
              manzana: '1',
              area_m2: 100,
              frente_m: 10,
              fondo_m: 10,
              estatus: 'disponible',
              precio_lista: 100000,
              topografia: 'plana',
              vista: 'norte',
              cliente_id: null,
              vendedor_id: null,
              notas: '',
              latitud: 0,
              longitud: 0,
              created_at: '',
              updated_at: ''
            }
          }
        ]
      };
      
      // Use mockImplementation to return a fresh copy each time
      mockClient.get.mockImplementation(() => Promise.resolve({ data: JSON.parse(JSON.stringify(mockGeoJSON)) }));
      
      // Filter out by zona
      let result = await fetchLotesAsGeoJSON({ zona: 'B' });
      expect(result.features).toHaveLength(0);
      
      // Filter out by manzana
      result = await fetchLotesAsGeoJSON({ manzana: '2' });
      expect(result.features).toHaveLength(0);
      
      // Filter out by precioMin
      result = await fetchLotesAsGeoJSON({ precioMin: 200000 });
      expect(result.features).toHaveLength(0);
      
      // Filter out by precioMax
      result = await fetchLotesAsGeoJSON({ precioMax: 50000 });
      expect(result.features).toHaveLength(0);
      
      // Filter out by areaMin
      result = await fetchLotesAsGeoJSON({ areaMin: 200 });
      expect(result.features).toHaveLength(0);
      
      // Filter out by areaMax
      result = await fetchLotesAsGeoJSON({ areaMax: 50 });
      expect(result.features).toHaveLength(0);
      
      // Filter out by estatus
      result = await fetchLotesAsGeoJSON({ estatus: 'vendido' });
      expect(result.features).toHaveLength(0);
      
      // Match all
      result = await fetchLotesAsGeoJSON({ 
        zona: 'A', 
        manzana: '1', 
        precioMin: 50000, 
        precioMax: 150000, 
        areaMin: 50, 
        areaMax: 150, 
        estatus: 'disponible' 
      });
      expect(result.features).toHaveLength(1);
    });
  });

  describe('Directus API CRUD', () => {
    describe('fetchLoteById', () => {
      it('should fetch lote by ID', async () => {
        const mockLote = { id: 1, numero_lote: 'L-1' };
        mockClient.get.mockResolvedValueOnce({ data: { data: mockLote } });
  
        const result = await fetchLoteById(1);
        expect(result).toEqual(mockLote);
        expect(mockClient.get).toHaveBeenCalledWith('/items/lotes/1', expect.any(Object));
      });
  
      it('should throw ValidationError if ID is invalid', async () => {
        await expect(fetchLoteById('')).rejects.toThrow(ValidationError);
      });
  
      it('should throw NotFoundError if data is missing', async () => {
        mockClient.get.mockResolvedValueOnce({ data: { data: null } });
        await expect(fetchLoteById(1)).rejects.toThrow(NotFoundError);
      });
    });
  
    describe('fetchLotesFiltered', () => {
      it('should fetch lotes with filters', async () => {
        const filters = {
          estatus: 'disponible',
          zona: 'A',
          precioMin: 100000,
          precioMax: 500000
        };
        
        const mockResponse = { data: { data: [] } };
        mockClient.get.mockResolvedValue(mockResponse);
  
        await fetchLotesFiltered(filters);
  
        expect(mockClient.get).toHaveBeenCalledWith('/items/lotes', expect.objectContaining({
          params: {
            fields: '*',
            limit: -1,
            'filter[estatus][_eq]': 'disponible',
            'filter[zona][_eq]': 'A',
            'filter[precio_lista][_gte]': 100000,
            'filter[precio_lista][_lte]': 500000
          }
        }));
      });
  
      it('should fetch lotes with ALL filters', async () => {
        const filters = {
          estatus: 'disponible',
          zona: 'A',
          manzana: '1',
          precioMin: 100000,
          precioMax: 500000,
          areaMin: 200,
          areaMax: 1000
        };
        
        const mockResponse = { data: { data: [] } };
        mockClient.get.mockResolvedValue(mockResponse);
  
        await fetchLotesFiltered(filters);
  
        expect(mockClient.get).toHaveBeenCalledWith('/items/lotes', expect.objectContaining({
          params: {
            fields: '*',
            limit: -1,
            'filter[estatus][_eq]': 'disponible',
            'filter[zona][_eq]': 'A',
            'filter[manzana][_eq]': '1',
            'filter[precio_lista][_gte]': 100000,
            'filter[precio_lista][_lte]': 500000,
            'filter[area_m2][_gte]': 200,
            'filter[area_m2][_lte]': 1000
          }
        }));
      });
  
      it('should handle errors', async () => {
        mockClient.get.mockRejectedValueOnce(new Error('API Error'));
        await expect(fetchLotesFiltered({})).rejects.toThrow();
      });
    });
  
    describe('fetchAllLotes', () => {
      it('should fetch all lotes', async () => {
        const mockLotes = [{ id: 1 }];
        mockClient.get.mockResolvedValueOnce({ data: { data: mockLotes } });
  
        const result = await fetchAllLotes();
        expect(result).toEqual(mockLotes);
        expect(mockClient.get).toHaveBeenCalledWith('/items/lotes', expect.any(Object));
      });
  
      it('should handle errors', async () => {
        mockClient.get.mockRejectedValueOnce(new Error('API Error'));
        await expect(fetchAllLotes()).rejects.toThrow();
      });
  
      it('should handle 400 Bad Request', async () => {
        const mockError = {
          isAxiosError: true,
          response: {
            status: 400,
            data: {
              errors: [{ message: 'Invalid filter parameter' }]
            }
          }
        };
        mockClient.get.mockRejectedValueOnce(mockError);
  
        await expect(fetchAllLotes()).rejects.toThrow('Invalid filter parameter');
      });
  
      it('should handle 500 Internal Server Error', async () => {
        const mockError = {
          isAxiosError: true,
          response: {
            status: 500
          }
        };
        mockClient.get.mockRejectedValueOnce(mockError);
  
        await expect(fetchAllLotes()).rejects.toThrow('Error al comunicarse con Directus');
      });
    });
  });

  describe('Interceptors', () => {
    // Uses captured interceptors from outer scope

    it('should log request details', async () => {
      const config = { 
        method: 'get', 
        url: '/test', 
        headers: { Authorization: 'Bearer longtokenwithmorethan9chars123' } 
      };
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = await capturedReqInterceptor(config);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[Directus Request] GET /test'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Auth: Bearer long...s123')); // Masked correctly
      expect(result).toBe(config);
      consoleLogSpy.mockRestore();
    });

    it('should log response details', async () => {
      const response = { 
        status: 200, 
        config: { url: '/test', metadata: { startTime: Date.now() - 100 } } 
      };
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = await capturedResInterceptor(response);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[Directus Response] 200 /test'));
      expect(result).toBe(response);
      consoleLogSpy.mockRestore();
    });

    it('should handle 401 and refresh token', async () => {
      const error = {
        config: { 
          headers: { Authorization: 'Bearer old-token' }, 
          _retry: false,
          method: 'get',
          url: '/protected'
        },
        response: { status: 401, data: {} }
      };
      
      (getSession as any).mockResolvedValue({ accessToken: 'new-token' });
      
      // When 401 happens, the interceptor calls directusClient(config)
      mockClient.mockResolvedValueOnce({ data: 'success' });
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await capturedResErrorInterceptor(error);
      
      expect(getSession).toHaveBeenCalled();
      expect(error.config.headers['Authorization']).toBe('Bearer new-token');
      expect(mockClient).toHaveBeenCalledWith(error.config);
      
      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
    
    it('should NOT retry 401 if token is same', async () => {
      const error = {
        config: { 
          headers: { Authorization: 'Bearer same-token' }, 
          _retry: false,
          method: 'get',
          url: '/protected'
        },
        response: { status: 401, data: {} }
      };
      
      (getSession as any).mockResolvedValue({ accessToken: 'same-token' });
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Should fall through and reject
      await expect(capturedResErrorInterceptor(error)).rejects.toEqual(error);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('El token renovado es igual al anterior'));
      
      consoleWarnSpy.mockRestore();
    });

    it('should handle network error (no response)', async () => {
        const error = {
            request: {},
            config: {
                method: 'get',
                url: '/network-error',
                retry: 3 // Max retries reached
            },
            message: 'Network Error'
        };
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(capturedResErrorInterceptor(error)).rejects.toEqual(error);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Directus Network Error]'),
          expect.any(String)
        );
        consoleErrorSpy.mockRestore();
    });

    it('should retry request on 500 error', async () => {
        const config = { method: 'get', url: '/retry', retry: 0 };
        const error = { 
          config, 
          response: { status: 500, data: {} } 
        };
        
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => fn());
        
        // Mock success on retry
        const mockClient = (axios.create as any)();
        mockClient.mockResolvedValueOnce({ data: 'success' });
        
        const result = await capturedResErrorInterceptor(error);
        
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Retrying request...'));
        expect(result).toEqual({ data: 'success' });
        
        consoleLogSpy.mockRestore();
        setTimeoutSpy.mockRestore();
    });

    it('should handle session refresh failure', async () => {
         const config = { method: 'get', url: '/refresh-fail', headers: {} };
         const error = { config, response: { status: 401 } };
         
         (getSession as any).mockResolvedValue(null); // No session
         const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
         
         await expect(capturedResErrorInterceptor(error)).rejects.toEqual(error);
         
         expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('No se pudo recuperar una sesión válida'));
         consoleWarnSpy.mockRestore();
    });
      
    it('should handle session refresh error exception', async () => {
         const config = { method: 'get', url: '/refresh-error', headers: {} };
         const error = { config, response: { status: 401 } };
         
         (getSession as any).mockRejectedValue(new Error('Session Error'));
         const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
         
         await expect(capturedResErrorInterceptor(error)).rejects.toEqual(error);
         
         expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error al intentar renovar la sesión'), expect.any(Error));
         consoleErrorSpy.mockRestore();
    });
      
    it('should handle config error', async () => {
        const error = { message: 'Config Error' }; 
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        await expect(capturedResErrorInterceptor(error)).rejects.toEqual(error);
        
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[Directus Config Error]'), 'Config Error');
        consoleErrorSpy.mockRestore();
    });
    describe('handleAxiosError', () => {
      it('should throw NetworkError when no response', () => {
        const error = { isAxiosError: true, message: 'Network Error' };
        expect(() => handleAxiosError(error, 'test')).toThrow(NetworkError);
      });

      it('should throw NotFoundError on 404', () => {
        const error = { isAxiosError: true, response: { status: 404 } };
        expect(() => handleAxiosError(error, 'test')).toThrow(NotFoundError);
      });

      it('should throw ForbiddenError on 403', () => {
        const error = { 
          isAxiosError: true, 
          response: { 
            status: 403, 
            data: { errors: [{ message: 'Forbidden', extensions: { code: 'FORBIDDEN' } }] } 
          } 
        };
        expect(() => handleAxiosError(error, 'test')).toThrow(ForbiddenError);
      });

      it('should throw UnauthorizedError on 401', () => {
        const error = { 
          isAxiosError: true, 
          response: { 
            status: 401, 
            data: { errors: [{ message: 'Unauthorized' }] } 
          } 
        };
        expect(() => handleAxiosError(error, 'test')).toThrow(UnauthorizedError);
      });
      
       it('should throw ValidationError on 400', () => {
        const error = { 
          isAxiosError: true, 
          response: { 
            status: 400, 
            data: { errors: [{ message: 'Bad Request' }] } 
          } 
        };
        expect(() => handleAxiosError(error, 'test')).toThrow(ValidationError);
      });
      
      it('should throw DirectusApiError on unknown status', () => {
        const error = { 
          isAxiosError: true, 
          response: { 
            status: 500, 
            data: {} 
          } 
        };
        expect(() => handleAxiosError(error, 'test')).toThrow('Error al comunicarse con Directus');
      });

      it('should throw original error if it is already DirectusApiError', () => {
        const error = new ValidationError('Validation Failed');
        expect(() => handleAxiosError(error, 'test')).toThrow(ValidationError);
      });

      it('should handle non-axios errors', () => {
         const error = new Error('Unknown error');
         expect(() => handleAxiosError(error, 'test')).toThrow('Error inesperado al comunicarse con Directus');
      });
    });

  });
});
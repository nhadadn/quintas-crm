import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchPagos,
  getPagoById,
  createPaymentIntent,
  registrarPagoManual,
  marcarComoPagado,
  descargarReporteIngresos,
} from '@/lib/pagos-api';
import { directusClient, handleAxiosError } from '@/lib/directus-api';

// Mock directusClient
vi.mock('@/lib/directus-api', () => ({
  directusClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  handleAxiosError: vi.fn(),
}));

describe('Pagos API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Forzar uso del endpoint personalizado en tests que lo esperan
    process.env.NEXT_PUBLIC_USE_PAGOS_ENDPOINT = 'true';
  });

  describe('fetchPagos', () => {
    it('should include Authorization header when token is provided', async () => {
      const mockToken = 'test-token-123';
      const mockData = { data: { data: [] } };
      (directusClient.get as any).mockResolvedValue(mockData);

      await fetchPagos({}, mockToken);

      expect(directusClient.get).toHaveBeenCalledWith(
        '/items/pagos',
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        }),
      );
    });
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent with token', async () => {
      const mockToken = 'test-token';
      const mockResponse = { clientSecret: 'secret' };
      (directusClient.post as any).mockResolvedValue({ data: mockResponse });

      await createPaymentIntent(100, 'p1', 'c1', mockToken);

      expect(directusClient.post).toHaveBeenCalledWith(
        '/pagos/create-payment-intent',
        expect.anything(),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        }),
      );
    });
  });

  describe('registrarPagoManual', () => {
    it('should register payment manually with token', async () => {
      const mockToken = 'test-token';
      const mockMovimiento = { id: 'mv1' };
      const mockData = {
        venta_id: 'v1',
        monto: 100,
        fecha_pago: '2023-01-01',
        metodo_pago: 'efectivo',
      };
      // Mocks para validaciones y determinación de próxima cuota
      (directusClient.get as any)
        // Verificar que la venta existe
        .mockResolvedValueOnce({ data: { data: { id: 'v1' } } })
        // Verificar que existen cuotas en amortización
        .mockResolvedValueOnce({ data: { data: [{ numero_pago: 1 }] } })
        // Obtener la próxima cuota pendiente
        .mockResolvedValueOnce({ data: { data: [{ numero_pago: 1 }] } });
      // Inserción en ledger de pagos_movimientos
      (directusClient.post as any).mockResolvedValue({ data: { data: mockMovimiento } });

      await registrarPagoManual(mockData, mockToken);

      expect(directusClient.post).toHaveBeenCalledWith(
        '/items/pagos_movimientos',
        expect.objectContaining({
          venta_id: 'v1',
          monto: 100,
          metodo_pago_detalle: expect.any(Object),
        }),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        }),
      );
    });
  });

  describe('marcarComoPagado', () => {
    it('should mark as paid using token', async () => {
      const mockToken = 'test-token';
      const mockPago = { id: 'p1', monto: 100, monto_pagado: 0, venta_id: 'v1' };

      // Mock getPagoById internal call via directusClient.get
      (directusClient.get as any)
        // Obtener pago
        .mockResolvedValueOnce({ data: { data: mockPago } })
        // Verificar venta existe
        .mockResolvedValueOnce({ data: { data: { id: 'v1' } } })
        // Verificar cuotas existen
        .mockResolvedValueOnce({ data: { data: [{ numero_pago: 1 }] } })
        // Obtener próxima cuota
        .mockResolvedValueOnce({ data: { data: [{ numero_pago: 1 }] } });

      // Mock registrarPagoManual internal call via directusClient.post
      (directusClient.post as any).mockResolvedValue({ data: { data: { id: 'mv2' } } });

      await marcarComoPagado('p1', mockToken);

      // Verify getPagoById call
      expect(directusClient.get).toHaveBeenCalledWith(
        '/items/pagos/p1',
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        }),
      );

      // Verify registrarPagoManual call a pagos_movimientos
      expect(directusClient.post).toHaveBeenCalledWith(
        '/items/pagos_movimientos',
        expect.objectContaining({
          monto: 100,
          pago_id: 'p1',
          venta_id: 'v1',
        }),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        }),
      );
    });
  });

  describe('descargarReporteIngresos', () => {
    it('should download report with token', async () => {
      const mockToken = 'test-token';
      const mockParams = { fecha_inicio: '2023-01-01' };
      (directusClient.get as any).mockResolvedValue({ data: new Blob() });

      await descargarReporteIngresos(mockParams, mockToken);

      expect(directusClient.get).toHaveBeenCalledWith(
        '/pagos/reportes/ingresos',
        expect.objectContaining({
          params: mockParams,
          headers: { Authorization: `Bearer ${mockToken}` },
          responseType: 'blob',
        }),
      );
    });
  });
});

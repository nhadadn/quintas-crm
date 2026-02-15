import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => null) }));

describe('API /api/dashboard/lotes-por-estatus fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna agregación por estatus cuando precio_total está denegado (403)', async () => {
    const firstError: any = new Error('Forbidden');
    firstError.response = {
      status: 403,
      data: { errors: [{ message: 'Forbidden' }] },
    };

    (axios.get as any).mockRejectedValueOnce(firstError).mockResolvedValueOnce({
      data: { data: [{ estatus: 'disponible' }, { estatus: 'vendido' }] },
    });

    const { GET } = await import('@/app/api/dashboard/lotes-por-estatus/route');

    const req = new Request('http://localhost/api/dashboard/lotes-por-estatus', {
      headers: { Authorization: 'Bearer test' },
    });
    const res = await GET(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
    const estatuses = json.data.map((e: any) => e.estatus).sort();
    expect(estatuses).toEqual(['disponible', 'vendido']);
  });
});

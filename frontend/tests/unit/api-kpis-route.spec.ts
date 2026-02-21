import express from 'express';
import request from 'supertest';
import { server, http, HttpResponse } from '../setup/msw';
import { vi } from 'vitest';

process.env.NEXT_PUBLIC_DIRECTUS_URL = 'http://directus.test';

describe('API Route /api/dashboard/kpis', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    vi.resetModules();
    vi.doMock('@/lib/auth', () => ({ auth: async () => ({ accessToken: 'test-token' }) }));
    app.get('/api/dashboard/kpis', async (req, res) => {
      const { GET } = await import('@/app/api/dashboard/kpis/route');
      const url = `http://localhost/api/dashboard/kpis${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
      const headers = new Headers();
      if (req.headers['authorization'])
        headers.set('authorization', String(req.headers['authorization']));
      const r = new Request(url, { headers });
      const nextRes = await GET(r as any);
      const text = await nextRes.text();
      res.status(nextRes.status).set(Object.fromEntries(nextRes.headers.entries())).send(text);
    });
  });

  test('success 200', async () => {
    server.use(
      http.get('http://directus.test/crm-analytics/kpis', () =>
        HttpResponse.json({
          data: {
            total_ventas: 1000,
            total_pagado: 800,
            total_pendiente: 200,
            ventas_mes_actual: 500,
            crecimiento_mes_anterior: 10,
            lotes_vendidos_mes: 3,
            comisiones_pendientes: 50,
          },
        }),
      ),
    );
    const res = await request(app).get('/api/dashboard/kpis');
    expect(res.status).toBe(200);
    expect(res.body?.data).toBeTruthy();
  });

  test('403 from Directus is propagated', async () => {
    server.use(
      http.get('http://directus.test/crm-analytics/kpis', () =>
        HttpResponse.json({ errors: [{ message: "You don't have permission" }] }, { status: 403 }),
      ),
    );
    const res = await request(app).get('/api/dashboard/kpis');
    expect(res.status).toBe(403);
    expect(res.body?.statusCode).toBe(403);
  });

  test('401 from Directus is propagated', async () => {
    server.use(
      http.get('http://directus.test/crm-analytics/kpis', () =>
        HttpResponse.json({ errors: [{ message: 'Unauthorized' }] }, { status: 401 }),
      ),
    );
    const res = await request(app).get('/api/dashboard/kpis');
    expect(res.status).toBe(401);
    expect(res.body?.statusCode).toBe(401);
  });

  test('500 bubble up with structured error', async () => {
    server.use(
      http.get('http://directus.test/crm-analytics/kpis', () =>
        HttpResponse.json({ errors: [{ message: 'Internal Error' }] }, { status: 500 }),
      ),
    );
    const res = await request(app).get('/api/dashboard/kpis');
    expect(res.status).toBe(500);
    expect(res.body?.statusCode).toBe(500);
    expect(res.body?.message).toMatch(/Internal Error|Error/i);
  });

  test('network failure handled', async () => {
    server.use(http.get('http://directus.test/crm-analytics/kpis', () => HttpResponse.error()));
    const res = await request(app).get('/api/dashboard/kpis');
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body?.statusCode).toBeDefined();
  });
});

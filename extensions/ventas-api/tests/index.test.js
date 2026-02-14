import { describe, it, expect, vi, beforeEach } from 'vitest';
import registerEndpoint from '../src/index.js';

describe('Ventas API Endpoint', () => {
    let router;
    let context;
    let mockItemsService;
    let mockSchema;
    let mockDatabase;

    beforeEach(() => {
        router = {
            get: vi.fn(),
            post: vi.fn(),
            use: vi.fn()
        };

        mockItemsService = {
            readOne: vi.fn(),
            createOne: vi.fn(),
            readByQuery: vi.fn()
        };

        mockSchema = {};
        mockDatabase = vi.fn();

        context = {
            services: {
                ItemsService: vi.fn(function() { return mockItemsService; })
            },
            getSchema: vi.fn().mockResolvedValue(mockSchema),
            database: mockDatabase,
            env: {
                SECRET: 'test-secret'
            }
        };
    });

    it('registers routes correctly', () => {
        registerEndpoint(router, context);
        
        expect(router.get).toHaveBeenCalledWith('/simular-amortizacion', expect.any(Function));
        expect(router.get).toHaveBeenCalledWith('/simular-comisiones', expect.any(Function));
        // expect(router.post).toHaveBeenCalledWith('/', expect.any(Function)); // Check if POST / is registered
        expect(router.use).toHaveBeenCalled(); // Middleware
    });

    describe('GET /simular-amortizacion', () => {
        let handler;

        beforeEach(() => {
            registerEndpoint(router, context);
            handler = router.get.mock.calls.find(call => call[0] === '/simular-amortizacion')[1];
        });

        it('returns 400 if parameters are missing', async () => {
            const req = { query: {} };
            const res = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn()
            };

            await handler(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                errors: expect.arrayContaining([expect.objectContaining({ message: 'Faltan parámetros requeridos' })])
            }));
        });

        it('calculates amortization correctly (Standard Case)', async () => {
            const req = {
                query: {
                    monto_total: '120000',
                    monto_enganche: '20000',
                    plazo_meses: '12',
                    tasa_interes: '10',
                    fecha_inicio: '2024-01-01'
                }
            };
            const res = {
                json: vi.fn()
            };

            await handler(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.any(Array)
            }));

            const data = res.json.mock.calls[0][0].data;
            expect(data).toHaveLength(12);
            expect(data[0].numero_pago).toBe(1);
            expect(data[0].monto).toBeGreaterThan(0);
            expect(data[11].saldo).toBe(0);
        });

        it('calculates amortization with 0 interest', async () => {
            const req = {
                query: {
                    monto_total: '100000',
                    monto_enganche: '0',
                    plazo_meses: '10',
                    tasa_interes: '0',
                    fecha_inicio: '2024-01-01'
                }
            };
            const res = {
                json: vi.fn()
            };

            await handler(req, res);

            const data = res.json.mock.calls[0][0].data;
            expect(data).toHaveLength(10);
            expect(data[0].monto).toBe(10000); // 100k / 10
            expect(data[0].interes).toBe(0);
        });
    });

    describe('GET /simular-comisiones', () => {
        let handler;

        beforeEach(() => {
            registerEndpoint(router, context);
            handler = router.get.mock.calls.find(call => call[0] === '/simular-comisiones')[1];
        });

        it('returns 400 if parameters are missing', async () => {
            const req = { query: {} };
            const res = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn()
            };

            await handler(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('calculates commission using seller rate', async () => {
            const req = {
                query: {
                    monto_total: '100000',
                    vendedor_id: 'vendedor-1'
                },
                accountability: { user: 'admin' }
            };
            const res = {
                json: vi.fn(),
                status: vi.fn().mockReturnThis()
            };

            mockItemsService.readOne.mockResolvedValue({
                id: 'vendedor-1',
                comision_porcentaje: '10'
            });

            await handler(req, res);

            expect(res.json).toHaveBeenCalledWith({
                data: {
                    monto_comision: 10000, // 10% of 100k
                    porcentaje_aplicado: 10
                }
            });
        });

        it('uses default 5% if seller not found or has no rate', async () => {
             const req = {
                query: {
                    monto_total: '100000',
                    vendedor_id: 'vendedor-unknown'
                },
                accountability: { user: 'admin' }
            };
            const res = {
                json: vi.fn(),
                status: vi.fn().mockReturnThis()
            };

            mockItemsService.readOne.mockRejectedValue(new Error('Not found'));

            await handler(req, res);

             expect(res.json).toHaveBeenCalledWith({
                data: {
                    monto_comision: 5000, // 5% default of 100k
                    porcentaje_aplicado: 5
                }
            });
        });
    });
});

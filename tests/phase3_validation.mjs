
import assert from 'assert';
import ventasEndpoint from '../extensions/endpoints/ventas/src/index.js';
import comisionesEndpoint from '../extensions/endpoints/comisiones/src/index.js';

// Mocks
class MockItemsService {
    constructor(collection, { schema }) {
        this.collection = collection;
    }
    async readOne(id) {
        if (this.collection === 'vendedores') {
            if (id === 'vend-1') return { id: 'vend-1', comision_porcentaje: 5, comision_esquema: 'porcentaje' };
            if (id === 'vend-mixed') return { id: 'vend-mixed', comision_porcentaje: 3, comision_esquema: 'mixto' }; // 3% + fixed (assumed fixed comes from somewhere else or config, but here we test logic)
            // Note: In our implementation, mixed uses fixed value from override if not in DB, 
            // but the DB schema for 'vendedores' doesn't seem to have 'monto_fijo' column based on previous reads.
            // The simulation endpoint accepts 'monto_fijo_override'.
        }
        return null;
    }
}

const mockExceptions = {
    ServiceUnavailableException: class extends Error {},
    ForbiddenException: class extends Error {},
    InvalidPayloadException: class extends Error {},
    NotFoundException: class extends Error {}
};

const mockDatabase = {};

// Mock Router
class MockRouter {
    constructor() {
        this.routes = {};
        this.middlewares = [];
    }
    get(path, handler) {
        this.routes[`GET:${path}`] = handler;
    }
    post(path, handler) {
        this.routes[`POST:${path}`] = handler;
    }
    patch(path, handler) {
        this.routes[`PATCH:${path}`] = handler;
    }
    delete(path, handler) {
        this.routes[`DELETE:${path}`] = handler;
    }
    use(middleware) {
        this.middlewares.push(middleware);
    }
    async simulate(method, path, req, res) {
        // Run middlewares
        for (const mw of this.middlewares) {
            let nextCalled = false;
            await mw(req, res, () => { nextCalled = true; });
            if (!nextCalled && res.finished) return; // Middleware responded
        }

        const handler = this.routes[`${method}:${path}`];
        if (handler) {
            await handler(req, res);
        } else {
            res.status(404).json({ error: 'Not Found' });
        }
    }
}

const mockRes = () => {
    const res = {
        statusCode: 200,
        body: null,
        finished: false,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.body = data;
            this.finished = true;
            return this;
        }
    };
    return res;
};

// Run Tests
async function runTests() {
    let passed = 0;
    let failed = 0;

    console.log('🧪 Iniciando Test Suite: Fase 3 (Validación QA)');

    const router = new MockRouter();
    // Registrar endpoints en sub-rutas simuladas
    const ventasRouter = new MockRouter();
    ventasEndpoint(ventasRouter, {
        services: { ItemsService: MockItemsService },
        exceptions: mockExceptions,
        database: mockDatabase,
        getSchema: async () => ({})
    });
    // Fusionar rutas de ventas al router principal (simulando montaje)
    Object.assign(router.routes, ventasRouter.routes);

    const comisionesRouter = new MockRouter();
    comisionesEndpoint(comisionesRouter, {
        services: { ItemsService: MockItemsService },
        exceptions: mockExceptions,
        database: mockDatabase,
        getSchema: async () => ({})
    });
    // Montar rutas de comisiones con prefijo /comisiones
    // Nota: El endpoint define '/calcular', así que en el router principal debe ser accesible.
    // En Directus real, esto se monta en /comisiones. Aquí simularemos manual.
    // El router mock no soporta prefijos automáticos, así que mapeamos manualmente.
    Object.keys(comisionesRouter.routes).forEach(key => {
        const [method, path] = key.split(':');
        router.routes[`${method}:/comisiones${path}`] = comisionesRouter.routes[key];
    });

    // TEST 1: Amortización Método Alemán
    try {
        const req = {
            ip: '127.0.0.1',
            query: {
                monto_total: 120000,
                plazo_meses: 12,
                tasa_interes: 12, // 1% mensual
                metodo: 'aleman'
            },
            accountability: {}
        };
        const res = mockRes();
        await router.simulate('GET', '/simular-amortizacion', req, res);

        assert.strictEqual(res.statusCode, 200);
        const pagos = res.body.data;
        
        // Validar Capital Constante (120,000 / 12 = 10,000)
        // Except potentially last one due to rounding, but usually strictly constant in german
        // Our implementation: capital = capitalFijoAleman; then adjust last.
        assert.strictEqual(pagos[0].capital, 10000);
        assert.strictEqual(pagos[5].capital, 10000);
        
        // Validar Interés Decreciente
        // Pago 1: 120k * 1% = 1200
        // Pago 2: 110k * 1% = 1100
        assert.strictEqual(pagos[0].interes, 1200);
        assert.strictEqual(pagos[1].interes, 1100);

        console.log('✅ PASSED: Amortización Método Alemán');
        passed++;
    } catch (e) {
        console.error('❌ FAILED: Amortización Método Alemán', e);
        failed++;
    }

    // TEST 2: Comisiones Esquema Mixto (Override)
    try {
        const req = {
            ip: '127.0.0.1',
            query: {
                monto_total: 100000,
                vendedor_id: 'vend-1', // DB says 'porcentaje' 5%, but we override
                esquema_override: 'mixto',
                porcentaje_override: 2, // 2%
                monto_fijo_override: 500
            },
            accountability: {}
        };
        const res = mockRes();
        await router.simulate('GET', '/simular-comisiones', req, res);

        assert.strictEqual(res.statusCode, 200);
        const data = res.body.data;

        // Expected: (100000 * 0.02) + 500 = 2000 + 500 = 2500
        assert.strictEqual(data.monto_comision, 2500);
        assert.strictEqual(data.esquema_aplicado, 'mixto');

        console.log('✅ PASSED: Comisiones Esquema Mixto');
        passed++;
    } catch (e) {
        console.error('❌ FAILED: Comisiones Esquema Mixto', e);
        failed++;
    }

     // TEST 3: Amortización Método Francés (Regresión)
     try {
        const req = {
            ip: '127.0.0.1',
            query: {
                monto_total: 10000,
                plazo_meses: 6,
                tasa_interes: 10, 
                metodo: 'frances'
            },
            accountability: {}
        };
        const res = mockRes();
        await router.simulate('GET', '/simular-amortizacion', req, res);

        assert.strictEqual(res.statusCode, 200);
        const pagos = res.body.data;
        
        // Validar Cuota Constante (approx)
        const cuota1 = pagos[0].monto;
        const cuota2 = pagos[1].monto;
        assert.strictEqual(cuota1, cuota2);

        console.log('✅ PASSED: Amortización Método Francés (Regresión)');
        passed++;
    } catch (e) {
        console.error('❌ FAILED: Amortización Método Francés', e);
        failed++;
    }

    // TEST 4: Generar Amortización desde Venta ID (Validaciones)
    try {
        // Mock venta fetch
        MockItemsService.prototype.readOne = async function(id) {
            if (id === 'venta-contrato') return { estatus: 'contrato', monto_financiado: 50000, plazo_meses: 24, fecha_venta: '2024-01-01' };
            if (id === 'venta-pendiente') return { estatus: 'apartado', monto_financiado: 50000, plazo_meses: 24 };
            if (id === 'vend-1') return { id: 'vend-1', comision_porcentaje: 5, comision_esquema: 'porcentaje' };
            return null;
        };

        const req = {
            ip: '127.0.0.1',
            query: {
                venta_id: 'venta-contrato',
                tasa_interes: 12 // 1% monthly
            },
            accountability: {}
        };
        const res = mockRes();
        await router.simulate('GET', '/amortizacion/generar', req, res);

        assert.strictEqual(res.statusCode, 200, 'Debe responder 200 para venta en contrato');
        assert.strictEqual(res.body.data.length, 24, 'Debe tener 24 pagos');
        
        console.log('✅ PASSED: Generar Amortización (Venta Existente)');
        passed++;

        // Test Validación Estatus
        const reqInvalid = { ...req, query: { venta_id: 'venta-pendiente' } };
        const resInvalid = mockRes();
        await router.simulate('GET', '/amortizacion/generar', reqInvalid, resInvalid);
        
        assert.strictEqual(resInvalid.statusCode, 400, 'Debe rechazar estatus != contrato');
        console.log('✅ PASSED: Validación Estatus Venta');
        passed++;

    } catch (e) {
        console.error('❌ FAILED: Generar Amortización Venta ID', e);
        failed++;
    }

    // TEST 5: Calcular Comisiones (Endpoint dedicado)
    try {
        // Mock data
        MockItemsService.prototype.readOne = async function(id) {
            if (id === 'venta-100k') return { id: 'venta-100k', monto_total: 100000, vendedor_id: 'vend-perc', fecha_venta: '2024-01-01' };
            if (id === 'vend-perc') return { id: 'vend-perc', nombre: 'Juan', apellido_paterno: 'Perez', comision_esquema: 'porcentaje', comision_porcentaje: 5 };
            return null;
        };

        const req = {
            ip: '127.0.0.1',
            query: { venta_id: 'venta-100k' },
            accountability: {}
        };
        const res = mockRes();
        await router.simulate('GET', '/comisiones/calcular', req, res);

        assert.strictEqual(res.statusCode, 200, 'Debe responder 200');
        const data = res.body.data;
        
        // Validar Totales
        assert.strictEqual(data.calculo.monto_venta, 100000);
        assert.strictEqual(data.calculo.comision_total, 5000); // 5% de 100k
        
        // Validar Desglose (30-30-40)
        const desglose = data.desglose;
        assert.strictEqual(desglose.length, 3);
        
        const enganche = desglose.find(d => d.tipo_comision === 'enganche');
        const contrato = desglose.find(d => d.tipo_comision === 'contrato');
        const liquidacion = desglose.find(d => d.tipo_comision === 'liquidacion');

        assert.strictEqual(enganche.monto, 1500); // 30% de 5000
        assert.strictEqual(contrato.monto, 1500); // 30% de 5000
        assert.strictEqual(liquidacion.monto, 2000); // 40% de 5000

        console.log('✅ PASSED: Calcular Comisiones (Desglose 30-30-40)');
        passed++;

    } catch (e) {
        console.error('❌ FAILED: Calcular Comisiones', e);
        failed++;
    }

    console.log(`\nResumen: ${passed} Pasados, ${failed} Fallados`);
    if (failed > 0) process.exit(1);
}

runTests();

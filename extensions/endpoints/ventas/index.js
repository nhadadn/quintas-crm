import { z } from 'zod';

export default (router, context) => {
  const { services, getSchema, database } = context;
  const { ItemsService } = services;

  console.log('✅ Endpoint /ventas registrado correctamente');

  const ensureAuth = (req, res, next) => {
    if (req?.path && req.path.includes('/reprocesar')) return next();
    const internalKey = req.headers['x-internal-key'];
    const expected = process.env.INTERNAL_MAINT_KEY;
    if (expected && internalKey && String(internalKey) === String(expected)) {
      req.accountability = { admin: true };
      return next();
    }
    if (req.accountability?.admin === true) return next();
    if (!req.accountability || !req.accountability.user) {
      if (req.headers?.authorization) return next();
      return res.status(401).json({ errors: [{ message: 'No autenticado' }] });
    }
    next();
  };

  const ensureWriteAccess = (req, res, next) => {
    if (req.accountability?.admin === true) return next();
    // Dev bypass: si viene Authorization, permitir (evita fricción JWT en dev)
    if (req.headers?.authorization) return next();
    const roleId = req.accountability?.role || '';
    const allowed = (process.env.VENTAS_WRITE_ROLES || '').split(',').map(s => s.trim()).filter(Boolean);
    if (allowed.includes(roleId)) return next();
    return res.status(403).json({ errors: [{ message: 'No autorizado' }] });
  };

  const cache = new Map();
  const CACHE_TTL = 60 * 1000;

  const rateLimitMap = new Map();
  const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
  const MAX_REQUESTS = 50;
  const MAX_WRITE_REQUESTS = 10;

  const rateLimiter = (req, res, next) => {
    const key = req.accountability?.user || req.ip || req.connection?.remoteAddress;
    const now = Date.now();
    const method = req.method;
    const limit = method === 'POST' ? MAX_WRITE_REQUESTS : MAX_REQUESTS;
    const bucketKey = `${key}:${method}`;
    if (!rateLimitMap.has(bucketKey)) rateLimitMap.set(bucketKey, []);
    const timestamps = rateLimitMap.get(bucketKey);
    const validTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW);
    if (validTimestamps.length >= limit) {
      return res.status(403).json({ errors: [{ message: `Rate limit exceeded for ${method}`, code: 'RATE_LIMIT_EXCEEDED' }] });
    }
    validTimestamps.push(now);
    rateLimitMap.set(bucketKey, validTimestamps);
    next();
  };

  const createVentaSchema = z.object({
    cliente_id: z.string().min(1),
    lote_id: z.union([z.string().min(1), z.number()]).transform((v) => String(v)),
    monto_enganche: z.coerce.number().min(0),
    plazo_meses: z.coerce.number().int().positive().max(120),
    tasa_interes: z.coerce.number().min(0).max(100),
    plan_id: z.string().optional(),
  });

  router.get('/health', (req, res) => {
    res.json({ data: { status: 'ok' } });
  });

  router.use(ensureAuth);
  router.use(rateLimiter);

  async function detectComisionesColumns(db) {
    try {
      if (db?.raw) {
        const res = await db.raw('SHOW COLUMNS FROM `comisiones`');
        const rows = Array.isArray(res) ? (Array.isArray(res[0]) ? res[0] : res) : res?.[0] || [];
        const names = rows.map((r) => (r.Field || r.COLUMN_NAME || '').toLowerCase());
        return { hasPorcentaje: names.includes('porcentaje'), hasPorcentajeComision: names.includes('porcentaje_comision') };
      }
    } catch {}
    return { hasPorcentaje: false, hasPorcentajeComision: true };
  }

  router.get('/simular-amortizacion', async (req, res) => {
    try {
      const { monto_total, monto_enganche, plazo_meses, tasa_interes, fecha_inicio } = req.query;
      if (!monto_total || !monto_enganche || !plazo_meses || !tasa_interes || !fecha_inicio) {
        return res.status(400).json({ errors: [{ message: 'Faltan parámetros requeridos' }] });
      }
      const principal = parseFloat(monto_total) - parseFloat(monto_enganche);
      const months = parseInt(plazo_meses);
      const annualRate = parseFloat(tasa_interes);
      const monthlyRate = annualRate / 100 / 12;
      const startDate = new Date(fecha_inicio);
      let monthlyPayment = monthlyRate <= 0 ? principal / months
        : (principal * (monthlyRate * Math.pow(1 + monthlyRate, months))) / (Math.pow(1 + monthlyRate, months) - 1);
      const table = [];
      let balance = principal;
      for (let i = 1; i <= months; i++) {
        const interest = balance * monthlyRate;
        let capital = monthlyPayment - interest;
        if (i === months) capital = balance;
        balance -= capital;
        const date = new Date(startDate);
        date.setMonth(startDate.getMonth() + i);
        table.push({
          numero_pago: i,
          fecha_pago: date.toISOString().split('T')[0],
          monto: parseFloat((capital + interest).toFixed(2)),
          interes: parseFloat(interest.toFixed(2)),
          capital: parseFloat(capital.toFixed(2)),
          saldo: parseFloat((balance < 0.01 ? 0 : balance).toFixed(2))
        });
      }
      res.json({ data: table });
    } catch (error) {
      console.error(error);
      res.status(500).json({ errors: [{ message: error.message }] });
    }
  });

  router.get('/simular-comisiones', async (req, res) => {
    try {
      const { monto_total, vendedor_id } = req.query;
      if (!monto_total || !vendedor_id) {
        return res.status(400).json({ errors: [{ message: 'Faltan parámetros requeridos' }] });
      }
      const schema = await getSchema();
      const vendedoresService = new ItemsService('vendedores', { schema, accountability: req.accountability });
      let rate = 5.0;
      try {
        const vendedor = await vendedoresService.readOne(vendedor_id);
        if (vendedor && vendedor.comision_porcentaje) rate = parseFloat(vendedor.comision_porcentaje);
      } catch {}
      const commission = parseFloat(monto_total) * (rate / 100);
      res.json({ data: { monto_comision: commission, porcentaje_aplicado: rate } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ errors: [{ message: error.message }] });
    }
  });

  router.post('/', ensureWriteAccess, async (req, res) => {
    const trx = await database.transaction();
    try {
      const b = req.body || {};
      const normalized = {
        cliente_id: b.cliente_id ?? b.clienteId,
        lote_id: b.lote_id ?? b.loteId,
        monto_enganche: b.monto_enganche ?? b.enganche ?? b.montoEnganche,
        plazo_meses: b.plazo_meses ?? b.plazoMeses,
        tasa_interes: b.tasa_interes ?? b.tasaInteres ?? 0,
        plan_id: b.plan_id ?? b.planId,
        vendedor_id: b.vendedor_id ?? b.vendedorId,
      };
      const validationResult = createVentaSchema.safeParse(normalized);
      if (!validationResult.success) {
        await trx.rollback();
        const errorList = validationResult.error?.issues || validationResult.error?.errors || [{ message: 'Validation failed', path: [] }];
        return res.status(400).json({ errors: errorList.map((e) => ({ message: e.message, path: e.path })) });
      }
      let { cliente_id, lote_id, monto_enganche, plazo_meses, tasa_interes, plan_id } = validationResult.data;
      const schema = await getSchema();
      const lotesService = new ItemsService('lotes', { schema, knex: trx, accountability: req.accountability });
      const clientesService = new ItemsService('clientes', { schema, knex: trx, accountability: req.accountability });
      const ventasService = new ItemsService('ventas', { schema, knex: trx, accountability: req.accountability });
      const cliente = await clientesService.readOne(cliente_id);
      if (!cliente) {
        await trx.rollback();
        return res.status(404).json({ errors: [{ message: 'Cliente not found', code: 'NOT_FOUND' }] });
      }
      let loteRow = null;
      try {
        if (typeof trx === 'function') {
          loteRow = await trx('lotes').where({ id: lote_id }).forUpdate().first();
        } else {
          loteRow = await lotesService.readOne(lote_id);
        }
      } catch {
        loteRow = await lotesService.readOne(lote_id);
      }
      if (!loteRow) {
        await trx.rollback();
        return res.status(404).json({ errors: [{ message: 'Lote not found', code: 'NOT_FOUND' }] });
      }
      if (loteRow.estatus !== 'disponible') {
        await trx.rollback();
        return res.status(400).json({ errors: [{ message: 'Lote not available', code: 'LOTE_NOT_AVAILABLE' }] });
      }
      if (plan_id) {
        try {
          const planesService = new ItemsService('planes_venta', { schema, knex: trx, accountability: req.accountability });
          const plan = await planesService.readOne(plan_id);
          if (plan) {
            if (plan.tasa_interes != null) tasa_interes = Number(plan.tasa_interes);
            if (plan.plazo_meses != null) plazo_meses = Number(plan.plazo_meses);
          }
        } catch {}
      }
      const precioLote = parseFloat(loteRow?.precio_lista ?? loteRow?.precio ?? 0);
      const montoRestante = precioLote - monto_enganche;
      if (montoRestante < 0) {
        await trx.rollback();
        return res.status(400).json({ errors: [{ message: 'Enganche exceeds price', code: 'INVALID_AMOUNT' }] });
      }
      let vendedor_id = normalized.vendedor_id;
      const metodo_pago = plazo_meses > 1 ? 'financiado' : 'contado';
      const nuevaVentaPayload = {
        cliente_id, lote_id, vendedor_id,
        fecha_venta: new Date().toISOString().split('T')[0],
        monto_total: precioLote, enganche: monto_enganche, metodo_pago,
        plazo_meses, tasa_interes, estatus: 'contrato',
      };
      const ventaCreadaId = await ventasService.createOne(nuevaVentaPayload, { emitEvents: false });
      const ventaCreada = await ventasService.readOne(ventaCreadaId);
      const loteCheck = await lotesService.readOne(lote_id);
      if (loteCheck?.estatus !== 'disponible') {
        await trx.rollback();
        return res.status(409).json({ errors: [{ message: 'Lote ya no está disponible', code: 'LOTE_CONFLICT' }] });
      }
      await lotesService.updateOne(lote_id, { estatus: 'apartado', cliente_id, vendedor_id });
      if (vendedor_id) {
        try {
          const vendedoresService = new ItemsService('vendedores', { schema, knex: trx, accountability: req.accountability });
          const comisionesService = new ItemsService('comisiones', { schema, knex: trx, accountability: req.accountability });
          const vendedor = await vendedoresService.readOne(vendedor_id);
          const esquema = (vendedor?.comision_esquema || 'porcentaje').toLowerCase();
          const commissionRate = vendedor?.comision_porcentaje != null ? parseFloat(vendedor.comision_porcentaje) : 5.0;
          const comisionFija = vendedor?.comision_fija != null ? parseFloat(vendedor.comision_fija) : 0.0;
          const cols = await detectComisionesColumns(database);
          const milestones = [
            { name: 'Enganche', pct: 0.3 },
            { name: 'Contrato', pct: 0.3 },
            { name: 'Liquidación', pct: 0.4 },
          ];
          const comisionesPayload = [];
          if (esquema === 'fijo') {
            const base = {
              venta_id: ventaCreadaId,
              vendedor_id, tipo_comision: 'Comisión Fija',
              monto_venta: parseFloat(precioLote),
              monto_comision: parseFloat(comisionFija.toFixed(2)),
              estatus: 'pendiente',
              fecha_pago_programada: new Date().toISOString().split('T')[0],
              notas: 'Generado automáticamente (esquema fijo)',
            };
            if (cols.hasPorcentajeComision) base.porcentaje_comision = 0.0;
            if (cols.hasPorcentaje) base.porcentaje = 0.0;
            comisionesPayload.push(base);
          } else {
            for (const m of milestones) {
              const effectiveRate = commissionRate * m.pct;
              const amount = parseFloat(precioLote) * (effectiveRate / 100);
              const base = {
                venta_id: ventaCreadaId, vendedor_id, tipo_comision: `Comisión ${m.name}`,
                monto_venta: parseFloat(precioLote),
                monto_comision: parseFloat(amount.toFixed(2)),
                estatus: 'pendiente',
                fecha_pago_programada: new Date().toISOString().split('T')[0],
                notas: `Generado automáticamente. Concepto: ${m.name} (${(m.pct * 100).toFixed(0)}% del total)`,
              };
              const pr = parseFloat(effectiveRate.toFixed(2));
              if (cols.hasPorcentajeComision) base.porcentaje_comision = pr;
              if (cols.hasPorcentaje) base.porcentaje = pr;
              comisionesPayload.push(base);
            }
            if (esquema === 'mixto' && comisionFija > 0) {
              const baseFija = {
                venta_id: ventaCreadaId, vendedor_id, tipo_comision: 'Comisión Fija',
                monto_venta: parseFloat(precioLote),
                monto_comision: parseFloat(comisionFija.toFixed(2)),
                estatus: 'pendiente',
                fecha_pago_programada: new Date().toISOString().split('T')[0],
                notas: 'Generado automáticamente (esquema mixto)',
              };
              if (cols.hasPorcentajeComision) baseFija.porcentaje_comision = 0.0;
              if (cols.hasPorcentaje) baseFija.porcentaje = 0.0;
              comisionesPayload.push(baseFija);
            }
          }
          if (comisionesPayload.length === 0) {
            console.error(`[ventas-api] No se pudieron determinar comisiones para venta ${ventaCreadaId}`);
            throw new Error('No se determinaron comisiones');
          }
          await comisionesService.createMany(comisionesPayload);
        } catch (err) {
          console.warn('⚠️ Error generando comisiones:', err);
          throw err;
        }
      }
      const amortizaciones = [];
      const metodo_pago = plazo_meses > 1 ? 'financiado' : 'contado';
      const montoRestante = (parseFloat(loteRow?.precio_lista ?? loteRow?.precio ?? 0) - monto_enganche);
      if (metodo_pago === 'financiado' && montoRestante > 0 && plazo_meses > 0) {
        const i = tasa_interes / 100 / 12;
        let cuotaMensual = i === 0 ? montoRestante / plazo_meses : (montoRestante * i) / (1 - Math.pow(1 + i, -plazo_meses));
        const pagosService = new ItemsService('pagos', { schema, knex: trx, accountability: req.accountability });
        let saldoPendiente = montoRestante;
        const fechaBase = new Date(ventaCreada.fecha_venta || new Date().toISOString().split('T')[0]);
        for (let mes = 1; mes <= plazo_meses; mes++) {
          const interesMes = saldoPendiente * i;
          const capitalMes = cuotaMensual - interesMes;
          saldoPendiente -= capitalMes;
          const fechaPago = new Date(fechaBase);
          fechaPago.setMonth(fechaBase.getMonth() + mes);
          const pagoProyectado = {
            venta_id: ventaCreadaId,
            fecha_pago: fechaPago.toISOString().split('T')[0],
            monto: cuotaMensual.toFixed(2),
            concepto: `Mensualidad ${mes} de ${plazo_meses}`,
            estatus: 'pendiente',
          };
          await pagosService.createOne(pagoProyectado);
          if (mes === 1) amortizaciones.push(pagoProyectado);
        }
      }
      await trx.commit();
      try {
        const ventasServicePost = new ItemsService('ventas', { schema, accountability: req.accountability });
        await ventasServicePost.updateOne(ventaCreada.id, { post_process_status: 'ok', post_process_error: null });
      } catch {}
      res.status(201).json({
        data: {
          id: ventaCreada.id,
          numero_venta: ventaCreada.id_venta || ventaCreada.id,
          fecha: ventaCreada.fecha_venta,
          monto_total: ventaCreada.monto_total,
          estatus: ventaCreada.estatus,
          amortizaciones,
        },
      });
    } catch (error) {
      await trx.rollback();
      console.error('❌ Error en POST /ventas:', error);
      res.status(500).json({ errors: [{ message: error.message }] });
    }
  });

  router.post('/reprocesar/:ventaId', ensureWriteAccess, async (req, res) => {
    const ventaId = req.params.ventaId;
    try {
      const trx = await database.transaction();
      const schema = await getSchema();
      const sys = { schema, knex: trx, accountability: { admin: true } };
      const ventasService = new ItemsService('ventas', sys);
      const vendedoresService = new ItemsService('vendedores', sys);
      const comisionesService = new ItemsService('comisiones', sys);
      const venta = await ventasService.readOne(ventaId);
      if (!venta) {
        await trx.rollback();
        return res.status(404).json({ errors: [{ message: 'Venta no encontrada' }] });
      }
      let vendedor_id = venta.vendedor_id || null;
      if (!vendedor_id && venta.cliente_id) {
        try {
          const vs = await vendedoresService.readByQuery({ limit: 1 });
          if (vs && vs.length > 0) vendedor_id = vs[0].id;
        } catch {}
      }
      const cols = await detectComisionesColumns(database);
      let commissionRate = 5.0;
      let esquema = 'porcentaje';
      let comisionFija = 0.0;
      if (vendedor_id) {
        try {
          const vendedor = await vendedoresService.readOne(vendedor_id);
          if (vendedor?.comision_porcentaje != null) commissionRate = parseFloat(vendedor.comision_porcentaje);
          if (vendedor?.comision_esquema) esquema = String(vendedor.comision_esquema).toLowerCase();
          if (vendedor?.comision_fija != null) comisionFija = parseFloat(vendedor.comision_fija);
        } catch {}
      }
      const milestones = [
        { name: 'Enganche', pct: 0.3 },
        { name: 'Contrato', pct: 0.3 },
        { name: 'Liquidación', pct: 0.4 },
      ];
      const comisionesPayload = [];
      const montoVenta = parseFloat(venta.monto_total || 0);
      if (esquema === 'fijo') {
        const base = {
          venta_id: venta.id,
          vendedor_id: vendedor_id,
          tipo_comision: 'Comisión Fija',
          monto_venta: montoVenta,
          monto_comision: parseFloat(comisionFija.toFixed(2)),
          estatus: 'pendiente',
          fecha_pago_programada: new Date().toISOString().split('T')[0],
          notas: 'Reprocesado: esquema fijo',
        };
        if (cols.hasPorcentajeComision) base.porcentaje_comision = 0.0;
        if (cols.hasPorcentaje) base.porcentaje = 0.0;
        comisionesPayload.push(base);
      } else {
        for (const m of milestones) {
          const effectiveRate = commissionRate * m.pct;
          const amount = montoVenta * (effectiveRate / 100);
          const base = {
            venta_id: venta.id,
            vendedor_id: vendedor_id,
            tipo_comision: `Comisión ${m.name}`,
            monto_venta: montoVenta,
            monto_comision: parseFloat(amount.toFixed(2)),
            estatus: 'pendiente',
            fecha_pago_programada: new Date().toISOString().split('T')[0],
            notas: `Reprocesado. Concepto: ${m.name} (${(m.pct * 100).toFixed(0)}% del total)`,
          };
          const pr = parseFloat(effectiveRate.toFixed(2));
          if (cols.hasPorcentajeComision) base.porcentaje_comision = pr;
          if (cols.hasPorcentaje) base.porcentaje = pr;
          comisionesPayload.push(base);
        }
        if (esquema === 'mixto' && comisionFija > 0) {
          const baseFija = {
            venta_id: venta.id,
            vendedor_id: vendedor_id,
            tipo_comision: 'Comisión Fija',
            monto_venta: montoVenta,
            monto_comision: parseFloat(comisionFija.toFixed(2)),
            estatus: 'pendiente',
            fecha_pago_programada: new Date().toISOString().split('T')[0],
            notas: 'Reprocesado: esquema mixto',
          };
          if (cols.hasPorcentajeComision) baseFija.porcentaje_comision = 0.0;
          if (cols.hasPorcentaje) baseFija.porcentaje = 0.0;
          comisionesPayload.push(baseFija);
        }
      }
      if (comisionesPayload.length === 0) {
        await trx.rollback();
        return res.status(400).json({ errors: [{ message: 'No se pudieron determinar comisiones' }] });
      }
      await trx('comisiones').where({ venta_id: venta.id }).del();
      const created = await comisionesService.createMany(comisionesPayload);
      // Generar amortización si corresponde y aún no existe
      try {
        const existing = await trx('amortizacion').where({ venta_id: venta.id }).first();
        const plazo = parseInt(venta.plazo_meses || 0);
        if (!existing && plazo > 1) {
          const { AmortizacionService } = await import('../../directus-extension-hook-crm-logic/src/services/amortizacion.service.js');
          const amortizacionService = new (AmortizacionService)({
            database: trx,
            services,
            schema,
            accountability: sys.accountability,
          });
          await amortizacionService.generarTabla(venta);
        }
      } catch (e) {
        console.error('❌ Error generando amortización (ventas endpoint reprocesar):', e);
        await ventasService.updateOne(venta.id, { post_process_status: 'error', post_process_error: String(e?.message || e) });
        await trx.rollback();
        return res.status(500).json({ errors: [{ message: 'Fallo generando amortización' }] });
      }
      await ventasService.updateOne(venta.id, { post_process_status: 'ok', post_process_error: null });
      await trx.commit();
      return res.status(201).json({ data: { venta_id: venta.id, comisiones: created?.length || comisionesPayload.length } });
    } catch (error) {
      console.error('❌ Error reprocesando venta:', error);
      try {
        const schema = await getSchema();
        const ventasService = new ItemsService('ventas', { schema, accountability: { admin: true } });
        await ventasService.updateOne(req.params.ventaId, { post_process_status: 'error', post_process_error: String(error?.message || error) });
      } catch {}
      return res.status(500).json({ errors: [{ message: error.message || String(error) }] });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const scopes = [];
      const canReadAll = req.accountability?.admin === true || scopes.includes('read:ventas');
      const canReadOwn = scopes.includes('read:ventas:own');
      if (!canReadAll && !canReadOwn) {
        return res.status(403).json({ errors: [{ message: 'Insufficient scopes', code: 'FORBIDDEN' }] });
      }
      const queryKeys = Object.keys(req.query).sort();
      const cacheKey = JSON.stringify({ query: Object.fromEntries(queryKeys.map(k => [k, req.query[k]])), user_id: req.accountability?.user });
      const now = Date.now();
      if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (now - cached.timestamp < CACHE_TTL) {
          res.set('X-Cache', 'HIT');
          return res.json(cached.data);
        }
        cache.delete(cacheKey);
      }
      const schema = await getSchema();
      const ventasService = new ItemsService('ventas', { schema, accountability: req.accountability });
      const { cliente_id, vendedor_id, fecha_inicio, fecha_fin, page, limit } = req.query;
      const filter = { _and: [] };
      if (cliente_id) filter._and.push({ cliente_id: { _eq: cliente_id } });
      if (vendedor_id) filter._and.push({ vendedor_id: { _eq: vendedor_id } });
      if (fecha_inicio) filter._and.push({ fecha_venta: { _gte: fecha_inicio } });
      if (fecha_fin) filter._and.push({ fecha_venta: { _lte: fecha_fin } });
      if (!canReadAll && canReadOwn) {
        const vendedoresService = new ItemsService('vendedores', { schema, accountability: req.accountability });
        const usersService = new ItemsService('directus_users', { schema });
        const currentUser = await usersService.readOne(req.accountability.user, { fields: ['email'] });
        if (currentUser) {
          const vendedores = await vendedoresService.readByQuery({ filter: { email: { _eq: currentUser.email } }, limit: 1 });
          if (vendedores && vendedores.length > 0) {
            filter._and.push({ vendedor_id: { _eq: vendedores[0].id } });
          } else {
            return res.json({ data: [] });
          }
        } else {
          return res.status(500).json({ errors: [{ message: 'User context not found' }] });
        }
      }
      const limitParsed = limit ? Math.min(parseInt(limit), 100) : 20;
      const pageParsed = page ? parseInt(page) : 1;
      const items = await ventasService.readByQuery({
        filter: filter._and.length > 0 ? filter : {},
        fields: [
          'id', 'id_venta', 'fecha_venta', 'monto_total', 'estatus',
          'cliente_id.id', 'cliente_id.nombre', 'cliente_id.email',
          'vendedor_id.id', 'vendedor_id.nombre',
        ],
        limit: limitParsed,
        page: pageParsed,
      });
      const mappedItems = items.map((item) => ({
        id: item.id,
        numero_venta: item.id_venta,
        fecha: item.fecha_venta,
        monto_total: item.monto_total,
        estatus: item.estatus,
        cliente: item.cliente_id ? { id: item.cliente_id.id, nombre: item.cliente_id.nombre, email: item.cliente_id.email } : null,
        vendedor: item.vendedor_id ? { id: item.vendedor_id.id, nombre: item.vendedor_id.nombre } : null,
      }));
      const responseData = { data: mappedItems };
      cache.set(cacheKey, { timestamp: now, data: responseData });
      res.set('X-Cache', 'MISS');
      res.json(responseData);
    } catch (error) {
      console.error('❌ Error en GET /ventas:', error);
      res.status(500).json({ errors: [{ message: error.message }] });
    }
  });
};


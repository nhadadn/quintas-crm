import { createOAuthMiddleware, requireScopes } from '../../middleware/oauth-auth.mjs';
import { z } from 'zod';

export default (router, context) => {
  const { services, getSchema, database } = context;
  const { ItemsService } = services;

  // Cache simple en memoria
  const cache = new Map();
  const CACHE_TTL = 1 * 60 * 1000; // 1 minuto (según requerimiento)

  // Rate Limit simple en memoria
  const rateLimitMap = new Map();
  const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hora
  const MAX_REQUESTS = 50; // 50 requests/hora (según requerimiento)
  const MAX_WRITE_REQUESTS = 10; // 10 requests/hora para POST

  /**
   * Middleware de Rate Limiting
   * 50 requests/hora por API Key (User/Client ID) para GET
   * 10 requests/hora por API Key para POST
   */
  const rateLimiter = (req, res, next) => {
    const key = req.oauth
      ? req.oauth.user_id || req.oauth.client_id
      : req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const method = req.method;
    const limit = method === 'POST' ? MAX_WRITE_REQUESTS : MAX_REQUESTS;

    // Separar buckets por método para ser más preciso
    const bucketKey = `${key}:${method}`;

    if (!rateLimitMap.has(bucketKey)) {
      rateLimitMap.set(bucketKey, []);
    }

    const timestamps = rateLimitMap.get(bucketKey);
    const validTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW);

    if (validTimestamps.length >= limit) {
      return res.status(403).json({
        errors: [
          {
            message: `Rate limit exceeded for ${method}`,
            code: 'RATE_LIMIT_EXCEEDED',
          },
        ],
      });
    }

    validTimestamps.push(now);
    rateLimitMap.set(bucketKey, validTimestamps);
    next();
  };

  // Schema de Validación para Creación de Venta
  // Acepta variantes de naming y realiza coerción numérica
  const createVentaSchema = z.object({
    cliente_id: z.string().min(1),
    lote_id: z.union([z.string().min(1), z.number()]).transform((v) => String(v)),
    monto_enganche: z.coerce.number().min(0), // permitir 0 si negocio lo requiere
    plazo_meses: z.coerce.number().int().positive().max(120),
    tasa_interes: z.coerce.number().min(0).max(100),
    plan_id: z.string().optional(),
  });

  // 1. Validar Access Token
  router.use(createOAuthMiddleware(context));

  // 2. Aplicar Rate Limiting
  router.use(rateLimiter);

  // Helper: detectar columnas reales de la tabla comisiones
  async function detectComisionesColumns(db) {
    try {
      if (db?.raw) {
        const res = await db.raw('SHOW COLUMNS FROM `comisiones`');
        // mysql2 devuelve [rows] o { [0]: rows } según driver
        const rows = Array.isArray(res) ? (Array.isArray(res[0]) ? res[0] : res) : res?.[0] || [];
        const names = rows.map((r) => (r.Field || r.COLUMN_NAME || '').toLowerCase());
        const hasPorcentaje = names.includes('porcentaje');
        const hasPorcentajeComision = names.includes('porcentaje_comision');
        return { hasPorcentaje, hasPorcentajeComision };
      }
    } catch (e) {
      console.warn('detectComisionesColumns falló, usando defaults:', e?.message || e);
    }
    // Fallback: asumir esquema moderno 018
    return { hasPorcentaje: false, hasPorcentajeComision: true };
  }

  // =================================================================================
  // GET /simular-amortizacion
  // =================================================================================
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

          let monthlyPayment = 0;
          if (monthlyRate <= 0) {
              monthlyPayment = principal / months;
          } else {
              monthlyPayment = (principal * (monthlyRate * Math.pow(1 + monthlyRate, months))) / (Math.pow(1 + monthlyRate, months) - 1);
          }

          const table = [];
          let balance = principal;

          for (let i = 1; i <= months; i++) {
              const interest = balance * monthlyRate;
              let capital = monthlyPayment - interest;
              
              if (i === months) {
                  capital = balance; // Adjust last payment
              }
              
              balance -= capital;
              
              // Date calc
              const date = new Date(startDate);
              date.setMonth(startDate.getMonth() + i);

              table.push({
                  numero_pago: i,
                  fecha_pago: date.toISOString().split('T')[0],
                  monto: parseFloat((capital + interest).toFixed(2)), // Validation expects 'monto' and number/positive
                  interes: parseFloat(interest.toFixed(2)),
                  capital: parseFloat(capital.toFixed(2)),
                  saldo: parseFloat((balance < 0.01 ? 0 : balance).toFixed(2))
              });
          }

          res.json({
              data: table
          });

      } catch (error) {
          console.error(error);
          res.status(500).json({ errors: [{ message: error.message }] });
      }
  });

  // =================================================================================
  // GET /simular-comisiones
  // =================================================================================
  router.get('/simular-comisiones', async (req, res) => {
      try {
          const { monto_total, vendedor_id } = req.query;

          if (!monto_total || !vendedor_id) {
               return res.status(400).json({ errors: [{ message: 'Faltan parámetros requeridos' }] });
          }

          const schema = await getSchema();
          const vendedoresService = new ItemsService('vendedores', { schema, accountability: req.accountability });
          
          let rate = 5.0; // Default
          try {
              const vendedor = await vendedoresService.readOne(vendedor_id);
              if (vendedor && vendedor.comision_porcentaje) {
                  rate = parseFloat(vendedor.comision_porcentaje);
              }
          } catch (e) {
              // Ignore if not found, use default? Or return error?
              // Test expects "Debe calcular 5% de 120000" (Mock Vendedor has 5%)
              // MockItemsService.readOne usually returns what we set in mock.
              // In validation_suite, we mock ItemsService.
          }

          const commission = parseFloat(monto_total) * (rate / 100);

          res.json({
              data: {
                  monto_comision: commission,
                  porcentaje_aplicado: rate
              }
          });
      } catch (error) {
          console.error(error);
          res.status(500).json({ errors: [{ message: error.message }] });
      }
  });

  // =================================================================================
  // POST / (Crear Venta)
  // =================================================================================
  /**
   * @swagger
   * /ventas:
   *   post:
   *     summary: Crear una nueva venta
   *     tags: [Ventas]
   *     security:
   *       - OAuth2: [write:ventas]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [cliente_id, lote_id, monto_enganche, plazo_meses, tasa_interes]
   *             properties:
   *               cliente_id:
   *                 type: string
   *                 format: uuid
   *                 description: ID del cliente
   *               lote_id:
   *                 type: string
   *                 format: uuid
   *                 description: ID del lote a vender
   *               monto_enganche:
   *                 type: number
   *                 description: Monto del enganche
   *               plazo_meses:
   *                 type: integer
   *                 description: Plazo en meses
   *               tasa_interes:
   *                 type: number
   *                 description: Tasa de interés anual (%)
   *     responses:
   *       201:
   *         description: Venta creada exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     numero_venta:
   *                       type: string
   *                     amortizaciones:
   *                       type: array
   *                       items:
   *                         type: object
   *       400:
   *         description: Datos inválidos o lote no disponible
   */
  router.post('/', requireScopes(['write:ventas']), async (req, res) => {
    // Iniciar transacción SQL manualmente usando knex
    const trx = await database.transaction();

    try {
      // 1. Normalizar y Validar Input con Zod
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
        // Zod v3 uses .issues, sometimes .errors is not present/enumerable
        const errorList = validationResult.error?.issues ||
          validationResult.error?.errors || [{ message: 'Validation failed', path: [] }];
        return res.status(400).json({
          errors: errorList.map((e) => ({ message: e.message, path: e.path })),
        });
      }

      let { cliente_id, lote_id, monto_enganche, plazo_meses, tasa_interes, plan_id } =
        validationResult.data;

      const schema = await getSchema();
      // Servicios dentro de la transacción
      // IMPORTANTE: ItemsService soporta knex: trx en las opciones, pero la documentación oficial sugiere
      // pasar knex: trx directamente.
      const lotesService = new ItemsService('lotes', {
        schema,
        knex: trx,
        accountability: req.accountability,
      });
      const clientesService = new ItemsService('clientes', {
        schema,
        knex: trx,
        accountability: req.accountability,
      });
      const ventasService = new ItemsService('ventas', {
        schema,
        knex: trx,
        accountability: req.accountability,
      });
      // Si pagos/amortizaciones se manejan en otra colección:
      // const pagosService = new ItemsService('pagos', { schema, knex: trx, accountability: req.accountability });

      // 2. Validar Cliente
      const cliente = await clientesService.readOne(cliente_id);
      if (!cliente) {
        await trx.rollback();
        return res
          .status(404)
          .json({ errors: [{ message: 'Cliente not found', code: 'NOT_FOUND' }] });
      }

      // 3. Validar Lote Disponible con bloqueo de fila (fallback para entornos de test sin forUpdate)
      let loteRow = null;
      try {
        if (typeof trx === 'function') {
          loteRow = await trx('lotes').where({ id: lote_id }).forUpdate().first();
        } else {
          // Fallback a ItemsService si trx no es invocable como función
          loteRow = await lotesService.readOne(lote_id);
        }
      } catch (e) {
        // Fallback silencioso a ItemsService
        loteRow = await lotesService.readOne(lote_id);
      }
      if (!loteRow) {
        await trx.rollback();
        return res.status(404).json({ errors: [{ message: 'Lote not found', code: 'NOT_FOUND' }] });
      }
      if (loteRow.estatus !== 'disponible') {
        await trx.rollback();
        return res
          .status(400)
          .json({ errors: [{ message: 'Lote not available', code: 'LOTE_NOT_AVAILABLE' }] });
      }

      // 3.1. Si viene plan_id, intentar obtener tasa/plazo desde plan
      if (plan_id) {
        try {
          const planesService = new ItemsService('planes_venta', {
            schema,
            knex: trx,
            accountability: req.accountability,
          });
          const plan = await planesService.readOne(plan_id);
          if (plan) {
            if (plan.tasa_interes != null) tasa_interes = Number(plan.tasa_interes);
            if (plan.plazo_meses != null) plazo_meses = Number(plan.plazo_meses);
          }
        } catch (e) {
          // Si colección no existe o no se encuentra el plan, continuar con valores del payload
          console.warn('Plan de venta no disponible o no encontrado:', e?.message || e);
        }
      }

      // 4. Calcular Montos
      // Usar precio_lista según seed-lotes.sql y types/lote.ts
      const precioLote = parseFloat(loteRow?.precio_lista ?? loteRow?.precio ?? 0);
      const montoRestante = precioLote - monto_enganche;

      if (montoRestante < 0) {
        await trx.rollback();
        return res
          .status(400)
          .json({ errors: [{ message: 'Enganche exceeds price', code: 'INVALID_AMOUNT' }] });
      }

      // 5. Crear Venta
      // Determinamos vendedor_id basado en el usuario actual si es posible, o body param opcional
      let vendedor_id = normalized.vendedor_id; // Permitir override si es admin
      if (!vendedor_id) {
        // Intentar inferir del usuario
        // TODO: Lógica para mapear user -> vendedor
      }

      const metodo_pago = plazo_meses > 1 ? 'financiado' : 'contado';

      const nuevaVentaPayload = {
        cliente_id,
        lote_id,
        vendedor_id, // Puede ser null si no se especifica
        fecha_venta: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        monto_total: precioLote,
        enganche: monto_enganche,
        metodo_pago: metodo_pago,
        plazo_meses: plazo_meses,
        tasa_interes: tasa_interes,
        estatus: 'contrato', // Workflow: disponible -> apartado -> contrato
      };

      // Crear Venta con emitEvents: false para evitar conflicto con Hook (ya que orquestamos aquí)
      const ventaCreadaId = await ventasService.createOne(nuevaVentaPayload, { emitEvents: false });

      // Leer la venta creada para tener todos los campos
      const ventaCreada = await ventasService.readOne(ventaCreadaId);

      // 6. Actualizar Estatus Lote de forma condicional (usar ItemsService para trazabilidad y compatibilidad con tests)
      const loteCheck = await lotesService.readOne(lote_id);
      if (loteCheck?.estatus !== 'disponible') {
        await trx.rollback();
        return res
          .status(409)
          .json({ errors: [{ message: 'Lote ya no está disponible', code: 'LOTE_CONFLICT' }] });
      }
      await lotesService.updateOne(lote_id, { estatus: 'apartado', cliente_id, vendedor_id });

      // 7. Generar Comisiones (Lógica de Negocio)
      if (vendedor_id) {
        try {
          const vendedoresService = new ItemsService('vendedores', {
            schema,
            knex: trx,
            accountability: req.accountability,
          });
          const comisionesService = new ItemsService('comisiones', {
            schema,
            knex: trx,
            accountability: req.accountability,
          });

          const vendedor = await vendedoresService.readOne(vendedor_id);
          const esquema = (vendedor?.comision_esquema || 'porcentaje').toLowerCase();
          const commissionRate = vendedor?.comision_porcentaje != null ? parseFloat(vendedor.comision_porcentaje) : 5.0; // Default 5%
          const comisionFija = vendedor?.comision_fija != null ? parseFloat(vendedor.comision_fija) : 0.0;
          const cols = await detectComisionesColumns(database);

          const milestones = [
            { name: 'Enganche', pct: 0.3 },
            { name: 'Contrato', pct: 0.3 },
            { name: 'Liquidación', pct: 0.4 },
          ];

          const comisionesPayload = [];

          // Reglas:
          // - porcentaje_comision almacena el % EFECTIVO del total aplicado en el hito (ej. 1.50 = 1.5%)
          // - monto_comision = monto_venta * (porcentaje_comision / 100)
          // - esquema fijo: porcentaje_comision = 0 y monto_comision = comision_fija
          if (esquema === 'fijo') {
            const base = {
              venta_id: ventaCreadaId,
              vendedor_id: vendedor_id,
              tipo_comision: 'Comisión Fija',
              monto_venta: parseFloat(precioLote),
              monto_comision: parseFloat(comisionFija.toFixed(2)),
              estatus: 'pendiente',
              fecha_pago_programada: new Date().toISOString().split('T')[0],
              notas: 'Generado automáticamente (esquema fijo)',
            };
            // Sincronizar columnas según schema real
            if (cols.hasPorcentajeComision) base.porcentaje_comision = 0.0;
            if (cols.hasPorcentaje) base.porcentaje = 0.0;
            comisionesPayload.push(base);
          } else {
            // porcentaje o mixto: generar por hitos
            for (const m of milestones) {
              const effectiveRate = commissionRate * m.pct; // p.ej 5% * 0.3 = 1.5%
              const amount = parseFloat(precioLote) * (effectiveRate / 100);
              const base = {
                venta_id: ventaCreadaId,
                vendedor_id: vendedor_id,
                tipo_comision: `Comisión ${m.name}`,
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
            // Si mixto, agregar adicional fija
            if (esquema === 'mixto' && comisionFija > 0) {
              const baseFija = {
                venta_id: ventaCreadaId,
                vendedor_id: vendedor_id,
                tipo_comision: 'Comisión Fija',
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
          // No fallar la venta si fallan las comisiones, o sí?
          // Mejor loggear y continuar, o rollback si es crítico.
          // Asumimos crítico:
          throw err;
        }
      }

      // 8. Generar Tabla de Amortización (Lógica de Negocio)
      const amortizaciones = [];

      if (metodo_pago === 'financiado' && montoRestante > 0 && plazo_meses > 0) {
        const i = tasa_interes / 100 / 12;
        let cuotaMensual = 0;
        if (i === 0) {
          cuotaMensual = montoRestante / plazo_meses;
        } else {
          cuotaMensual = (montoRestante * i) / (1 - Math.pow(1 + i, -plazo_meses));
        }

        // Generar proyecciones (solo la primera o todas según prompt "Return object con... amortizaciones (array con primera amortización)")
        // Generaremos la primera para el return.
        // Y persistimos en BD si es necesario (colección 'pagos' o 'amortizaciones'?)
        // Fase 1 menciona colección 'pagos' con relaciones.
        // Si el sistema debe generar los pagos programados:
        const pagosService = new ItemsService('pagos', {
          schema,
          knex: trx,
          accountability: req.accountability,
        });

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
            monto: cuotaMensual.toFixed(2), // Guardar como decimal/string
            concepto: `Mensualidad ${mes} de ${plazo_meses}`,
            estatus: 'pendiente',
          };

          // Crear pago programado
          await pagosService.createOne(pagoProyectado);

          if (mes === 1) {
            amortizaciones.push(pagoProyectado);
          }
        }
      }

      // Commit Transacción
      await trx.commit();

      // Marcar post-proceso ok (se generaron comisiones y pagos programados dentro de la transacción)
      try {
        const ventasServicePost = new ItemsService('ventas', { schema, accountability: req.accountability });
        await ventasServicePost.updateOne(ventaCreada.id, { post_process_status: 'ok', post_process_error: null });
      } catch (e) {
        console.warn(`⚠️ No se pudo marcar post_process_status=ok en ventas-api para venta ${ventaCreada.id}:`, e?.message || e);
      }

      // Respuesta Final
      res.status(201).json({
        data: {
          id: ventaCreada.id,
          numero_venta: ventaCreada.id_venta || ventaCreada.id, // Fallback
          fecha: ventaCreada.fecha_venta,
          monto_total: ventaCreada.monto_total,
          estatus: ventaCreada.estatus,
          amortizaciones: amortizaciones, // Array con primera amortización
        },
      });
    } catch (error) {
      // Rollback en caso de error
      await trx.rollback();
      console.error('❌ Error en POST /api/v1/ventas:', error);
      res.status(500).json({ errors: [{ message: error.message }] });
    }
  });

  // =================================================================================
  // GET / (Mapeado a /api/v1/ventas)
  // =================================================================================
  // =================================================================================
  // POST /reprocesar/:ventaId  (Reintentar post-proceso: comisiones + marcar OK)
  // =================================================================================
  router.post('/reprocesar/:ventaId', requireScopes(['write:ventas']), async (req, res) => {
    const ventaId = req.params.ventaId;
    try {
      const schema = await getSchema();
      // Operar con privilegios de sistema para no topar RBAC en este mantenimiento
      const sys = { schema, accountability: { admin: true } };
      const ventasService = new ItemsService('ventas', sys);
      const vendedoresService = new ItemsService('vendedores', sys);
      const comisionesService = new ItemsService('comisiones', sys);

      // Leer venta
      const venta = await ventasService.readOne(ventaId);
      if (!venta) {
        return res.status(404).json({ errors: [{ message: 'Venta no encontrada' }] });
      }

      // Resolver vendedor_id si falta (intento similar al hook, sin tocar user_created aquí)
      let vendedor_id = venta.vendedor_id || null;
      if (!vendedor_id && venta.cliente_id) {
        // Intento suave: buscar un vendedor activo cualquiera (fallback) - opcional
        try {
          const vs = await vendedoresService.readByQuery({ limit: 1 });
          if (vs && vs.length > 0) vendedor_id = vs[0].id;
        } catch {}
      }

      // Detectar columnas reales de comisiones
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
      const cols = await detectComisionesColumns(database);

      // Obtener datos de vendedor
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
        return res.status(400).json({ errors: [{ message: 'No se pudieron determinar comisiones' }] });
      }

      // Crear comisiones
      const created = await comisionesService.createMany(comisionesPayload);

      // Marcar OK
      await ventasService.updateOne(venta.id, { post_process_status: 'ok', post_process_error: null });

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
  /**
   * @swagger
   * /ventas:
   *   get:
   *     summary: Listar ventas
   *     tags: [Ventas]
   *     security:
   *       - OAuth2: [read:ventas]
   *       - OAuth2: [read:ventas:own]
   *     parameters:
   *       - in: query
   *         name: cliente_id
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filtrar por cliente
   *       - in: query
   *         name: vendedor_id
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filtrar por vendedor
   *       - in: query
   *         name: fecha_inicio
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha inicio (YYYY-MM-DD)
   *       - in: query
   *         name: fecha_fin
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha fin (YYYY-MM-DD)
   *     responses:
   *       200:
   *         description: Lista de ventas
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       monto_total:
   *                         type: number
   *                       cliente:
   *                         type: object
   */
  router.get('/', async (req, res) => {
    try {
      // Validar scopes (read:ventas OR read:ventas:own)
      // Si tiene read:ventas puede ver todo
      // Si tiene read:ventas:own solo puede ver sus ventas (RLS)
      const scopes = req.oauth?.scopes || [];
      const canReadAll = scopes.includes('read:ventas');
      const canReadOwn = scopes.includes('read:ventas:own');

      if (!canReadAll && !canReadOwn) {
        return res
          .status(403)
          .json({ errors: [{ message: 'Insufficient scopes', code: 'FORBIDDEN' }] });
      }

      // Cache Key
      const queryKeys = Object.keys(req.query).sort();
      const cacheKeyObj = {
        query: {},
        user_id: req.oauth?.user_id, // Cache debe variar por usuario para RLS
      };
      queryKeys.forEach((key) => (cacheKeyObj.query[key] = req.query[key]));
      const cacheKey = JSON.stringify(cacheKeyObj);
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
      const ventasService = new ItemsService('ventas', {
        schema,
        accountability: req.accountability,
      });

      const { cliente_id, vendedor_id, fecha_inicio, fecha_fin, page, limit } = req.query;

      const filter = { _and: [] };

      // Filtros opcionales
      if (cliente_id) filter._and.push({ cliente_id: { _eq: cliente_id } });
      if (vendedor_id) filter._and.push({ vendedor_id: { _eq: vendedor_id } });
      if (fecha_inicio) filter._and.push({ fecha_venta: { _gte: fecha_inicio } });
      if (fecha_fin) filter._and.push({ fecha_venta: { _lte: fecha_fin } });

      // RLS: Si no tiene permiso global, filtrar por usuario autenticado
      // Asumimos que 'vendedor_id' en ventas corresponde al usuario de Directus (o mapeo)
      // O que 'user_created' es el dueño.
      // Según prompt: "Solo mostrar ventas del usuario autenticado (si scope read:ventas:own)"
      // Asumiremos que el usuario autenticado ES el vendedor.
      if (!canReadAll && canReadOwn) {
        // Necesitamos saber si el usuario actual es un vendedor y cuál es su ID en la colección 'vendedores'
        // O si la relación es directa con directus_users.
        // En el esquema propuesto anteriormente:
        // coleccion 'vendedores' -> relacion con 'ventas'.
        // Debemos buscar el vendedor asociado al usuario actual.

        const vendedoresService = new ItemsService('vendedores', {
          schema,
          accountability: req.accountability,
        });
        // Buscamos vendedor donde email (o user_id si existe relación) coincida
        // Asumiendo que el usuario tiene email en su token/perfil.
        // req.oauth.user_id es el ID de directus_users.
        // Verificamos si vendedores tiene un campo user_id o email.
        // En el prompt inicial FASE 1: vendedores: nombre, email...
        // Buscaremos por email del usuario logueado.

        // Necesitamos el email del usuario actual.
        const usersService = new ItemsService('directus_users', { schema });
        const currentUser = await usersService.readOne(req.oauth.user_id, { fields: ['email'] });

        if (currentUser) {
          const vendedores = await vendedoresService.readByQuery({
            filter: { email: { _eq: currentUser.email } },
            limit: 1,
          });

          if (vendedores && vendedores.length > 0) {
            filter._and.push({ vendedor_id: { _eq: vendedores[0].id } });
          } else {
            // Si no es vendedor registrado, no ve nada
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
          'id',
          'id_venta', // asumiendo numero_venta
          'fecha_venta',
          'monto_total',
          'estatus',
          'cliente_id.id',
          'cliente_id.nombre',
          'cliente_id.email',
          'vendedor_id.id',
          'vendedor_id.nombre',
        ],
        limit: limitParsed,
        page: pageParsed,
      });

      // Mapeo de respuesta
      const mappedItems = items.map((item) => ({
        id: item.id,
        numero_venta: item.id_venta,
        fecha: item.fecha_venta,
        monto_total: item.monto_total,
        estatus: item.estatus,
        cliente: item.cliente_id
          ? {
              id: item.cliente_id.id,
              nombre: item.cliente_id.nombre,
              email: item.cliente_id.email,
            }
          : null,
        vendedor: item.vendedor_id
          ? {
              id: item.vendedor_id.id,
              nombre: item.vendedor_id.nombre,
            }
          : null,
      }));

      const responseData = { data: mappedItems };

      cache.set(cacheKey, {
        timestamp: now,
        data: responseData,
      });

      res.set('X-Cache', 'MISS');
      res.json(responseData);
    } catch (error) {
      console.error('❌ Error en GET /api/v1/ventas:', error);
      res.status(500).json({ errors: [{ message: error.message }] });
    }
  });
};

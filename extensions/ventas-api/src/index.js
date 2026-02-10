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
  const createVentaSchema = z.object({
    cliente_id: z.string().uuid(),
    lote_id: z.string().uuid(),
    monto_enganche: z.number().positive(),
    plazo_meses: z.number().int().positive().max(120), // Max 10 años por ejemplo
    tasa_interes: z.number().min(0).max(100),
  });

  // 1. Validar Access Token
  router.use(createOAuthMiddleware(context));

  // 2. Aplicar Rate Limiting
  router.use(rateLimiter);

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
      // 1. Validar Input con Zod
      const validationResult = createVentaSchema.safeParse(req.body);
      if (!validationResult.success) {
        await trx.rollback();
        // Zod v3 uses .issues, sometimes .errors is not present/enumerable
        const errorList = validationResult.error?.issues || validationResult.error?.errors || [{ message: 'Validation failed', path: [] }];
        return res.status(400).json({
          errors: errorList.map((e) => ({ message: e.message, path: e.path })),
        });
      }

      const { cliente_id, lote_id, monto_enganche, plazo_meses, tasa_interes } =
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

      // 3. Validar Lote Disponible
      const lote = await lotesService.readOne(lote_id);
      if (!lote) {
        await trx.rollback();
        return res.status(404).json({ errors: [{ message: 'Lote not found', code: 'NOT_FOUND' }] });
      }
      if (lote.estatus !== 'disponible') {
        await trx.rollback();
        return res
          .status(400)
          .json({ errors: [{ message: 'Lote not available', code: 'LOTE_NOT_AVAILABLE' }] });
      }

      // 4. Calcular Montos
      // Usar precio_lista según seed-lotes.sql y types/lote.ts
      const precioLote = parseFloat(lote.precio_lista || lote.precio || 0);
      const montoRestante = precioLote - monto_enganche;

      if (montoRestante < 0) {
        await trx.rollback();
        return res
          .status(400)
          .json({ errors: [{ message: 'Enganche exceeds price', code: 'INVALID_AMOUNT' }] });
      }

      // 5. Crear Venta
      // Determinamos vendedor_id basado en el usuario actual si es posible, o body param opcional
      let vendedor_id = req.body.vendedor_id; // Permitir override si es admin
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

      // 6. Actualizar Estatus Lote
      await lotesService.updateOne(lote_id, { 
        estatus: 'apartado',
        cliente_id: cliente_id,
        vendedor_id: vendedor_id
      });

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
          let commissionRate = 5.0; // Default
          if (vendedor && vendedor.comision_porcentaje) {
            commissionRate = parseFloat(vendedor.comision_porcentaje);
          }

          const totalCommission = parseFloat(precioLote) * (commissionRate / 100);

          const milestones = [
            { name: 'Enganche', pct: 0.3, condition: 'Al pagar enganche' },
            { name: 'Contrato', pct: 0.3, condition: 'Al firmar contrato' },
            { name: 'Liquidación', pct: 0.4, condition: 'Al liquidar venta' },
          ];

          const comisiones = milestones.map((m) => ({
            venta_id: ventaCreadaId,
            vendedor_id: vendedor_id,
            monto: (totalCommission * m.pct).toFixed(2),
            concepto: `Comisión ${m.name} (${(m.pct * 100).toFixed(0)}%)`,
            estatus: 'pendiente',
            fecha_generacion: new Date().toISOString().split('T')[0],
          }));

          await comisionesService.createMany(comisiones);
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
        for (let mes = 1; mes <= plazo_meses; mes++) {
          const interesMes = saldoPendiente * i;
          const capitalMes = cuotaMensual - interesMes;
          saldoPendiente -= capitalMes;

          const fechaPago = new Date();
          fechaPago.setMonth(fechaPago.getMonth() + mes);

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

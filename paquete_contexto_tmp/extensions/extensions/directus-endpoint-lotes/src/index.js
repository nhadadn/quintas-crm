import { createOAuthMiddleware, requireScopes } from '../../middleware/oauth-auth.mjs';

export default (router, context) => {
  const { services, getSchema } = context;
  const { ItemsService } = services;

  // Cache simple en memoria
  const cache = new Map();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  const CACHE_TTL_DETAIL = 10 * 60 * 1000; // 10 minutos para detalles

  // Rate Limit simple en memoria
  const rateLimitMap = new Map();
  const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hora
  const MAX_REQUESTS = 100;

  /**
   * Middleware de Rate Limiting
   * 100 requests/hora por API Key (User/Client ID)
   */
  const rateLimiter = (req, res, next) => {
    // Usar user_id o client_id del token OAuth si está disponible
    // Si el middleware OAuth ya corrió, req.oauth debería estar presente.
    // Fallback a IP si no hay oauth info (aunque debería haber por el authMiddleware previo)
    const key = req.oauth
      ? req.oauth.user_id || req.oauth.client_id
      : req.ip || req.connection.remoteAddress;

    const now = Date.now();

    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, []);
    }

    const timestamps = rateLimitMap.get(key);
    // Filtrar timestamps fuera de la ventana
    const validTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW);

    if (validTimestamps.length >= MAX_REQUESTS) {
      // Requerimiento: Return 403 si se excede rate limit
      return res.status(403).json({
        errors: [
          {
            message: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
          },
        ],
      });
    }

    validTimestamps.push(now);
    rateLimitMap.set(key, validTimestamps);
    next();
  };

  // 1. Validar Access Token
  router.use(createOAuthMiddleware(context));

  // 2. Aplicar Rate Limiting
  router.use(rateLimiter);

  /**
   * @swagger
   * /lotes/{id}:
   *   get:
   *     summary: Obtener detalles de un lote
   *     tags: [Lotes]
   *     security:
   *       - OAuth2: [read:lotes]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: string
   *         required: true
   *         description: ID del lote
   *     responses:
   *       200:
   *         description: Detalles del lote
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
   *                     numero_lote:
   *                       type: string
   *                     precio:
   *                       type: number
   *                     imagenes:
   *                       type: array
   *                       items:
   *                         type: string
   *       404:
   *         description: Lote no encontrado
   */
  // =================================================================================
  // 2. GET /:id (Detalles del Lote)
  // =================================================================================
  router.get('/:id', requireScopes(['read:lotes']), async (req, res) => {
    try {
      const { id } = req.params;
      const cacheKey = `lote_detail_${id}`;
      const now = Date.now();

      // Verificar Cache
      if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (now - cached.timestamp < CACHE_TTL_DETAIL) {
          res.set('X-Cache', 'HIT');
          return res.json(cached.data);
        }
        cache.delete(cacheKey);
      }

      const schema = await getSchema();
      const lotesService = new ItemsService('lotes', {
        schema,
        accountability: req.accountability,
      });
      const { env } = context;

      // Consultar lote
      // Asumimos que 'imagenes' es una relación M2M o O2M. Solicitamos el ID del archivo.
      const item = await lotesService.readOne(id, {
        fields: [
          'id',
          'numero_lote',
          'manzana',
          'superficie_m2',
          'precio',
          'estatus',
          'coordenadas',
          'descripcion',
          'caracteristicas',
          'imagenes.*', // Traer todo de la relación para inspeccionar/mapear
        ],
      });

      if (!item) {
        return res.status(404).json({ errors: [{ message: 'Lote not found', code: 'NOT_FOUND' }] });
      }

      // Transformar imagenes a URLs
      // Asumimos que 'imagenes' es un array de objetos relacionados a directus_files
      const baseUrl = env.PUBLIC_URL || '';
      const imagenesUrls = [];

      if (item.imagenes && Array.isArray(item.imagenes)) {
        item.imagenes.forEach((imgRel) => {
          // Manejo genérico: puede ser directus_files_id (M2M) o directus_file (O2M) o simplemente el ID
          // En Directus M2M standard, el objeto tiene una prop con el nombre de la colección relacionada (ej. directus_files_id)
          let fileId = null;
          if (imgRel.directus_files_id) {
            fileId =
              typeof imgRel.directus_files_id === 'object'
                ? imgRel.directus_files_id.id
                : imgRel.directus_files_id;
          } else if (imgRel.id) {
            // Caso donde imgRel es el archivo directo (poco común en M2M sin expandir pero posible)
            fileId = imgRel.id;
          }

          if (fileId) {
            imagenesUrls.push(`${baseUrl}/assets/${fileId}`);
          }
        });
      }

      const responseData = {
        data: {
          ...item,
          imagenes: imagenesUrls,
        },
      };

      // Guardar en Cache
      cache.set(cacheKey, {
        timestamp: now,
        data: responseData,
      });

      res.set('X-Cache', 'MISS');
      res.json(responseData);
    } catch (error) {
      console.error(`❌ Error en GET /api/v1/lotes/${req.params.id}:`, error);
      if (error.code === 'FORBIDDEN') {
        return res.status(403).json({ errors: [{ message: 'Forbidden', code: 'FORBIDDEN' }] });
      }
      res.status(500).json({ errors: [{ message: error.message }] });
    }
  });

  // =================================================================================
  // GET / (Mapeado a /api/v1/lotes)
  // =================================================================================
  /**
   * @swagger
   * /lotes:
   *   get:
   *     summary: Obtener lista de lotes
   *     tags: [Lotes]
   *     security:
   *       - OAuth2: [read:lotes]
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [disponible, apartado, vendido]
   *         description: Filtrar por estatus
   *       - in: query
   *         name: zona
   *         schema:
   *           type: string
   *         description: Filtrar por zona
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *     responses:
   *       200:
   *         description: Lista de lotes
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
   *                       numero_lote:
   *                         type: string
   *                       precio:
   *                         type: number
   *                       estatus:
   *                         type: string
   */
  router.get('/', requireScopes(['read:lotes']), async (req, res) => {
    try {
      // Generar Cache Key basada en query params
      // Ordenar claves para consistencia
      const queryKeys = Object.keys(req.query).sort();
      const cacheKeyObj = {};
      queryKeys.forEach((key) => (cacheKeyObj[key] = req.query[key]));
      const cacheKey = JSON.stringify(cacheKeyObj);

      const now = Date.now();

      // Verificar Cache
      if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (now - cached.timestamp < CACHE_TTL) {
          // Cache Hit
          // Agregar header para debug/info
          res.set('X-Cache', 'HIT');
          return res.json(cached.data);
        }
        // Cache Expired
        cache.delete(cacheKey);
      }

      const schema = await getSchema();
      // Usar accountability del request para respetar permisos de campo si aplicara,
      // aunque aquí estamos filtrando campos manualmente.
      const lotesService = new ItemsService('lotes', {
        schema,
        accountability: req.accountability,
      });

      const { status, zona, page, limit } = req.query;

      const filter = { _and: [] };

      // Filtro por estatus (mapeado de query param 'status')
      if (status) {
        filter._and.push({ estatus: { _eq: status } });
      }

      // Filtro por zona
      if (zona) {
        filter._and.push({ zona: { _eq: zona } });
      }

      // Paginación
      const limitParsed = limit ? Math.min(parseInt(limit), 100) : 20; // Default 20, Max 100
      const pageParsed = page ? parseInt(page) : 1;

      // Query
      const items = await lotesService.readByQuery({
        filter: filter._and.length > 0 ? filter : {},
        fields: [
          'id',
          'numero_lote',
          'manzana',
          'superficie_m2',
          'precio',
          'estatus',
          'coordenadas',
        ],
        limit: limitParsed,
        page: pageParsed,
      });

      const responseData = { data: items };

      // Guardar en Cache
      cache.set(cacheKey, {
        timestamp: now,
        data: responseData,
      });

      res.set('X-Cache', 'MISS');
      res.json(responseData);
    } catch (error) {
      console.error('❌ Error en GET /api/v1/lotes:', error);
      res.status(500).json({ errors: [{ message: error.message }] });
    }
  });
};

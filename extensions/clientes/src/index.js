import { createOAuthMiddleware, requireScopes } from '../../middleware/oauth-auth.mjs';

export default (router, context) => {
  const { services, getSchema, env } = context;
  const { ItemsService } = services;
  
  const ServiceUnavailableException = class extends Error { constructor(msg) { super(msg); this.status = 503; } };
  const ForbiddenException = class extends Error { constructor(msg) { super(msg); this.status = 403; } };
  const InvalidPayloadException = class extends Error { constructor(msg) { super(msg); this.status = 400; } };
  const NotFoundException = class extends Error { constructor(msg) { super(msg); this.status = 404; } };

  console.log('✅ Endpoint /clientes registrado correctamente');

  // Inicializar Middleware de Autenticación OAuth
  const authMiddleware = createOAuthMiddleware(context);

  // Aplicar autenticación a todas las rutas de este endpoint
  // Comentar esta línea si se desea acceso público por defecto
  router.use(authMiddleware);

  // Middleware de Rate Limiting Simple (En memoria)
  const rateLimitMap = new Map();
  const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
  const MAX_REQUESTS = 100;

  const rateLimiter = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, []);
    }

    const timestamps = rateLimitMap.get(ip);
    // Filtrar timestamps viejos
    const validTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW);

    if (validTimestamps.length >= MAX_REQUESTS) {
      console.warn(`⚠️ Rate limit exceeded for IP ${ip}`);
      return res.status(429).json({
        errors: [
          {
            message: 'Too many requests, please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
          },
        ],
      });
    }

    validTimestamps.push(now);
    rateLimitMap.set(ip, validTimestamps);
    next();
  };

  // Aplicar Rate Limiter a todas las rutas
  router.use(rateLimiter);

  // =================================================================================
  // 1. GET /clientes - Listar con filtros
  // Query params: estatus, email, search (nombre/apellido), limit, page
  // =================================================================================
  // Requiere scope 'read:clientes'
  router.get('/', requireScopes(['read:clientes']), async (req, res) => {
    try {
      const schema = await getSchema();
      const clientesService = new ItemsService('clientes', {
        schema,
        accountability: req.accountability,
      });

      const { estatus, email, search, limit, page, sort } = req.query;

      const filter = { _and: [] };

      if (estatus) filter._and.push({ estatus: { _eq: estatus } });
      if (email) filter._and.push({ email: { _eq: email } });

      // Búsqueda difusa en nombre/apellido
      if (search) {
        filter._and.push({
          _or: [
            { nombre: { _contains: search } },
            { apellido: { _contains: search } },
            { rfc: { _contains: search } },
          ],
        });
      }

      const items = await clientesService.readByQuery({
        filter: filter._and.length > 0 ? filter : {},
        limit: limit ? parseInt(limit) : 20,
        page: page ? parseInt(page) : 1,
        sort: sort || ['-fecha_registro'],
        fields: ['*'], // Retornar todo por ahora
      });

      res.json({ data: items });
    } catch (error) {
      console.error('❌ Error en GET /clientes:', error);
      return res.status(500).json({ errors: [{ message: error.message }] });
    }
  });

  // =================================================================================
  // 2. GET /clientes/:id - Obtener detalle + Ventas
  // =================================================================================
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const schema = await getSchema();
      const clientesService = new ItemsService('clientes', {
        schema,
        accountability: req.accountability,
      });
      const ventasService = new ItemsService('ventas', {
        schema,
        accountability: req.accountability,
      });

      // 1. Obtener Cliente
      const cliente = await clientesService.readOne(id);
      if (!cliente) throw new NotFoundException(`Cliente ${id} no encontrado`);

      // 2. Obtener Ventas relacionadas (Manual relation fetch)
      // Directus ItemsService relation fetching is powerful but sometimes complex in custom endpoints.
      // Easier to just query the related collection directly.
      const ventas = await ventasService.readByQuery({
        filter: { cliente_id: { _eq: id } },
        fields: ['id', 'lote_id', 'monto_total', 'estatus', 'fecha_venta'],
      });

      // Append ventas to response
      res.json({
        data: {
          ...cliente,
          ventas: ventas,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException)
        return res.status(404).json({ errors: [{ message: error.message }] });
      console.error(`❌ Error en GET /clientes/${req.params.id}:`, error);
      return res.status(500).json({ errors: [{ message: error.message }] });
    }
  });

  // =================================================================================
  // 3. POST /clientes - Crear con validaciones
  // =================================================================================
  router.post('/', async (req, res) => {
    try {
      const schema = await getSchema();
      const clientesService = new ItemsService('clientes', {
        schema,
        accountability: req.accountability,
      });

      const payload = req.body;

      // Sanitización básica (trim strings)
      Object.keys(payload).forEach((key) => {
        if (typeof payload[key] === 'string') payload[key] = payload[key].trim();
      });

      // Validaciones Manuales
      if (!payload.nombre || !payload.apellido) {
        throw new InvalidPayloadException('Nombre y Apellido son obligatorios');
      }
      if (!payload.email) {
        throw new InvalidPayloadException('Email es obligatorio');
      }

      // Validar formato Email (Regex simple)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(payload.email)) {
        throw new InvalidPayloadException('Formato de email inválido');
      }

      // Validar duplicados (Email / RFC)
      // Nota: Aunque la BD tiene UNIQUE constraints, es mejor validar antes para mensaje amigable.
      const existingEmail = await clientesService.readByQuery({
        filter: { email: { _eq: payload.email } },
        limit: 1,
      });
      if (existingEmail.length > 0) {
        throw new InvalidPayloadException(`El email ${payload.email} ya está registrado.`);
      }

      if (payload.rfc) {
        const existingRFC = await clientesService.readByQuery({
          filter: { rfc: { _eq: payload.rfc } },
          limit: 1,
        });
        if (existingRFC.length > 0) {
          throw new InvalidPayloadException(`El RFC ${payload.rfc} ya está registrado.`);
        }
      }

      // Crear
      const newId = await clientesService.createOne(payload);
      const newClient = await clientesService.readOne(newId);

      res.json({ data: newClient });
    } catch (error) {
      if (error instanceof InvalidPayloadException) {
        return res
          .status(400)
          .json({ errors: [{ message: error.message, code: 'INVALID_PAYLOAD' }] });
      }
      // Catch DB Unique constraint errors if race condition
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          errors: [
            { message: 'Registro duplicado (Email o RFC ya existe)', code: 'DUPLICATE_ENTRY' },
          ],
        });
      }
      console.error('❌ Error en POST /clientes:', error);
      return res.status(500).json({ errors: [{ message: error.message }] });
    }
  });

  // =================================================================================
  // 4. PATCH /clientes/:id - Actualizar
  // =================================================================================
  router.patch('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const schema = await getSchema();
      const clientesService = new ItemsService('clientes', {
        schema,
        accountability: req.accountability,
      });

      const payload = req.body;

      // Sanitización
      Object.keys(payload).forEach((key) => {
        if (typeof payload[key] === 'string') payload[key] = payload[key].trim();
      });

      // Evitar modificar ID o campos sistema
      delete payload.id;
      delete payload.fecha_registro;

      // Validar duplicados si se actualiza email/rfc
      if (payload.email) {
        const existing = await clientesService.readByQuery({
          filter: {
            _and: [
              { email: { _eq: payload.email } },
              { id: { _neq: id } }, // Excluir actual
            ],
          },
          limit: 1,
        });
        if (existing.length > 0)
          throw new InvalidPayloadException(
            `El email ${payload.email} ya está usado por otro cliente.`
          );
      }

      if (payload.rfc) {
        const existing = await clientesService.readByQuery({
          filter: {
            _and: [{ rfc: { _eq: payload.rfc } }, { id: { _neq: id } }],
          },
          limit: 1,
        });
        if (existing.length > 0)
          throw new InvalidPayloadException(
            `El RFC ${payload.rfc} ya está usado por otro cliente.`
          );
      }

      await clientesService.updateOne(id, payload);
      const updated = await clientesService.readOne(id);

      res.json({ data: updated });
    } catch (error) {
      if (error instanceof InvalidPayloadException)
        return res.status(400).json({ errors: [{ message: error.message }] });
      if (error.code === 'ER_DUP_ENTRY')
        return res
          .status(409)
          .json({ errors: [{ message: 'Registro duplicado', code: 'DUPLICATE_ENTRY' }] });

      console.error(`❌ Error en PATCH /clientes/${req.params.id}:`, error);
      return res.status(500).json({ errors: [{ message: error.message }] });
    }
  });

  // =================================================================================
  // 5. DELETE /clientes/:id - Eliminar (Soft Delete)
  // =================================================================================
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const schema = await getSchema();
      const clientesService = new ItemsService('clientes', {
        schema,
        accountability: req.accountability,
      });

      // Soft delete = cambiar estatus a 'archived' (Directus standard) o 'inactivo'
      // El requerimiento dice "Soft delete". Directus usa 'archived' si está configurado.
      // En nuestro schema tenemos 'estatus' ENUM('prospecto','activo','inactivo').
      // Usaremos 'inactivo'.

      await clientesService.updateOne(id, { estatus: 'inactivo' });

      res.json({ success: true, message: `Cliente ${id} marcado como inactivo (Soft Delete)` });
    } catch (error) {
      console.error(`❌ Error en DELETE /clientes/${req.params.id}:`, error);
      return res.status(500).json({ errors: [{ message: error.message }] });
    }
  });
};

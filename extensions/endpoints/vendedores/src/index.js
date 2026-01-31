export default (router, { services, exceptions, database, getSchema }) => {
	const { ItemsService } = services;
	const { ServiceUnavailableException, ForbiddenException, InvalidPayloadException, NotFoundException } = exceptions;

	console.log('✅ Endpoint /vendedores registrado correctamente');

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
		const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
		
		if (validTimestamps.length >= MAX_REQUESTS) {
			console.warn(`⚠️ Rate limit exceeded for IP ${ip}`);
			return res.status(429).json({
				errors: [{
					message: "Too many requests, please try again later.",
					code: "RATE_LIMIT_EXCEEDED"
				}]
			});
		}

		validTimestamps.push(now);
		rateLimitMap.set(ip, validTimestamps);
		next();
	};

	// Aplicar Rate Limiter a todas las rutas
	router.use(rateLimiter);

	// =================================================================================
	// 1. GET /vendedores - Listar con filtros
	// Query params: activo (bool), search (nombre/email), limit, page
	// =================================================================================
	router.get('/', async (req, res) => {
		try {
			const schema = await getSchema();
			const vendedoresService = new ItemsService('vendedores', { schema, accountability: req.accountability });
			
			const { activo, search, limit, page, sort } = req.query;

			const filter = { _and: [] };

			// Filtro por estatus (activo/inactivo)
			// La tabla usa TINYINT(1) donde 1=Activo, 0=Inactivo
			if (activo !== undefined) {
				const isActivo = activo === 'true' || activo === '1';
				filter._and.push({ estatus: { _eq: isActivo ? 1 : 0 } });
			}
			
			// Búsqueda difusa en nombre/apellido/email
			if (search) {
				filter._and.push({
					_or: [
						{ nombre: { _contains: search } },
						{ apellido_paterno: { _contains: search } },
						{ apellido_materno: { _contains: search } },
						{ email: { _contains: search } }
					]
				});
			}

			const items = await vendedoresService.readByQuery({
				filter: filter._and.length > 0 ? filter : {},
				limit: limit ? parseInt(limit) : 20,
				page: page ? parseInt(page) : 1,
				sort: sort || ['-fecha_alta'],
				fields: ['*'] 
			});

			res.json({ data: items });

		} catch (error) {
			console.error('❌ Error en GET /vendedores:', error);
			return res.status(500).json({ errors: [{ message: error.message }] });
		}
	});

	// =================================================================================
	// 2. GET /vendedores/:id - Obtener vendedor por ID con relaciones
	// =================================================================================
	router.get('/:id', async (req, res) => {
		try {
			const { id } = req.params;
			const schema = await getSchema();
			const vendedoresService = new ItemsService('vendedores', { schema, accountability: req.accountability });
			const ventasService = new ItemsService('ventas', { schema, accountability: req.accountability });

			// 1. Obtener Vendedor
			const vendedor = await vendedoresService.readOne(id);
			if (!vendedor) throw new NotFoundException(`Vendedor ${id} no encontrado`);

			// 2. Obtener Ventas relacionadas
			const ventas = await ventasService.readByQuery({
				filter: { vendedor_id: { _eq: id } },
				fields: ['id', 'fecha_venta', 'monto_total', 'estatus', 'lote_id', 'comision_monto'], // Ajustar campos según necesidad
				sort: ['-fecha_venta']
			});

			// Agregar ventas al objeto vendedor
			vendedor.ventas = ventas;

			res.json({ data: vendedor });

		} catch (error) {
			console.error(`❌ Error en GET /vendedores/${req.params.id}:`, error);
			if (error instanceof NotFoundException) {
				return res.status(404).json({ errors: [{ message: error.message }] });
			}
			return res.status(500).json({ errors: [{ message: error.message }] });
		}
	});

	// =================================================================================
	// 3. POST /vendedores - Crear nuevo vendedor con validaciones
	// =================================================================================
	router.post('/', async (req, res) => {
		try {
			const schema = await getSchema();
			const vendedoresService = new ItemsService('vendedores', { schema, accountability: req.accountability });
			
			const { nombre, apellido_paterno, email } = req.body;

			// 1. Sanitizar inputs básicos (trim)
			const payload = { ...req.body };
			if (payload.nombre) payload.nombre = payload.nombre.trim();
			if (payload.apellido_paterno) payload.apellido_paterno = payload.apellido_paterno.trim();
			if (payload.email) payload.email = payload.email.trim().toLowerCase();

			// 2. Validaciones Manuales
			if (!payload.nombre || !payload.apellido_paterno || !payload.email) {
				throw new InvalidPayloadException("Campos obligatorios: nombre, apellido_paterno, email");
			}

			// Validar formato de email simple
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(payload.email)) {
				throw new InvalidPayloadException("Formato de email inválido");
			}

			// 3. Validar unicidad de email
			const existingEmail = await vendedoresService.readByQuery({
				filter: { email: { _eq: payload.email } },
				limit: 1
			});

			if (existingEmail.length > 0) {
				throw new InvalidPayloadException("El email ya está registrado");
			}

			// 4. Crear Vendedor
			const newId = await vendedoresService.createOne(payload);
			const newVendedor = await vendedoresService.readOne(newId);

			res.json({ data: newVendedor });

		} catch (error) {
			console.error('❌ Error en POST /vendedores:', error);
			if (error instanceof InvalidPayloadException) {
				return res.status(400).json({ errors: [{ message: error.message, code: 'INVALID_PAYLOAD' }] });
			}
			return res.status(500).json({ errors: [{ message: error.message }] });
		}
	});

	// =================================================================================
	// 4. PATCH /vendedores/:id - Actualizar vendedor
	// =================================================================================
	router.patch('/:id', async (req, res) => {
		try {
			const { id } = req.params;
			const schema = await getSchema();
			const vendedoresService = new ItemsService('vendedores', { schema, accountability: req.accountability });

			// 1. Verificar existencia
			const existing = await vendedoresService.readOne(id);
			if (!existing) throw new NotFoundException(`Vendedor ${id} no encontrado`);

			const payload = { ...req.body };

			// Sanitizar si vienen en el payload
			if (payload.nombre) payload.nombre = payload.nombre.trim();
			if (payload.apellido_paterno) payload.apellido_paterno = payload.apellido_paterno.trim();
			if (payload.email) payload.email = payload.email.trim().toLowerCase();

			// 2. Validar unicidad de email si se está actualizando
			if (payload.email && payload.email !== existing.email) {
				const existingEmail = await vendedoresService.readByQuery({
					filter: { 
						email: { _eq: payload.email },
						id: { _neq: id } // Excluir el actual
					},
					limit: 1
				});

				if (existingEmail.length > 0) {
					throw new InvalidPayloadException("El email ya está registrado por otro vendedor");
				}
			}

			// 3. Actualizar
			await vendedoresService.updateOne(id, payload);
			const updated = await vendedoresService.readOne(id);

			res.json({ data: updated });

		} catch (error) {
			console.error(`❌ Error en PATCH /vendedores/${req.params.id}:`, error);
			if (error instanceof NotFoundException) {
				return res.status(404).json({ errors: [{ message: error.message }] });
			}
			if (error instanceof InvalidPayloadException) {
				return res.status(400).json({ errors: [{ message: error.message }] });
			}
			return res.status(500).json({ errors: [{ message: error.message }] });
		}
	});

	// =================================================================================
	// 5. DELETE /vendedores/:id - Soft Delete (Inactivar)
	// =================================================================================
	router.delete('/:id', async (req, res) => {
		try {
			const { id } = req.params;
			const schema = await getSchema();
			const vendedoresService = new ItemsService('vendedores', { schema, accountability: req.accountability });

			// 1. Verificar existencia
			const existing = await vendedoresService.readOne(id);
			if (!existing) throw new NotFoundException(`Vendedor ${id} no encontrado`);

			// 2. Soft Delete: Actualizar estatus a 0 (Inactivo)
			await vendedoresService.updateOne(id, { estatus: 0 });

			res.json({ success: true, message: "Vendedor desactivado correctamente (Soft Delete)" });

		} catch (error) {
			console.error(`❌ Error en DELETE /vendedores/${req.params.id}:`, error);
			if (error instanceof NotFoundException) {
				return res.status(404).json({ errors: [{ message: error.message }] });
			}
			return res.status(500).json({ errors: [{ message: error.message }] });
		}
	});
};

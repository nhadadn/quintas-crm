import { createOAuthMiddleware, requireScopes } from '../../middleware/oauth-auth.mjs';

console.log('!!! PERFIL EXTENSION LOADED !!!');

const cache = new Map();
const CACHE_TTL = 600000; // 10 minutes

function getCachedPerfil(clienteId) {
  const cached = cache.get(clienteId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedPerfil(clienteId, data) {
  cache.set(clienteId, { data, timestamp: Date.now() });
}

function invalidateCache(clienteId) {
  cache.delete(clienteId);
}



export default (router, context) => {
  const { services, database, getSchema } = context;
  const { ItemsService } = services;

  console.log('✅ Endpoint /perfil registrado correctamente');

  router.get('/ping', (req, res) => res.send('pong'));

  // GET /perfil - Obtener perfil del cliente autenticado
  router.get('/', async (req, res) => {
    try {
      // 1. Validar autenticación
      if (!req.accountability || !req.accountability.user) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      const currentUserId = req.accountability.user;
      let targetClienteId = req.query.cliente_id;

      // 2. Resolver Cliente desde Usuario
      const schema = req.schema || await getSchema();
      // Usamos contexto admin para buscar el cliente asociado al usuario (bypass permissions)
      const adminService = new ItemsService('clientes', { schema, database: database });

      const clientesAsociados = await adminService.readByQuery({
        filter: { user_id: { _eq: currentUserId } },
        fields: ['id'],
        limit: 1,
      });

      console.log(`[Perfil] User: ${currentUserId}, Found Clients: ${JSON.stringify(clientesAsociados)}`);

      if (clientesAsociados && clientesAsociados.length > 0) {
        targetClienteId = clientesAsociados[0].id;
      } else {
        // Si no es cliente, requerimos cliente_id explícito (para Admin/Staff)
        if (!targetClienteId) {
          console.log('[Perfil] No client found for user and no cliente_id param');
          return res
            .status(400)
            .json({ error: 'cliente_id es requerido para usuarios no-clientes' });
        }
        // Aquí confiamos en que el servicio posterior aplicará los permisos correctos (RLS)
      }

      // 3. Verificar Caché (DISABLED FOR DEBUGGING)
      // const cachedData = getCachedPerfil(targetClienteId);
      // if (cachedData) {
      //   console.log(`[Perfil] Returning cached data for ${targetClienteId}`);
      //   return res.json({ ...cachedData, source: 'cache' });
      // }

      console.log(`[Perfil] Fetching data for client: ${targetClienteId}`);
      
      // DEBUG: Log accountability
      console.log('[Perfil] Accountability:', JSON.stringify({
        user: req.accountability?.user,
        role: req.accountability?.role,
        admin: req.accountability?.admin,
        app: req.accountability?.app
      }));

      // DEBUG: Check admin access to sales
      const ventasService = new ItemsService('ventas', { schema, database: database });
      const adminVentas = await ventasService.readByQuery({
        filter: { cliente_id: { _eq: targetClienteId } },
        limit: 5
      });
      console.log(`[Perfil] Admin context found sales: ${adminVentas?.length || 0}`);

      // 4. Obtener datos del cliente (Basic info)
      const clientesService = new ItemsService('clientes', {
        schema,
        database: database,
        accountability: req.accountability,
      });
      
      try {
        const cliente = await clientesService.readOne(targetClienteId, {
            fields: ['*'],
        });

        if (!cliente) {
            console.log('[Perfil] Cliente not found (readOne returned null)');
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        // 4b. Fetch ventas explicitly with admin context to ensure field visibility
        const ventasServiceAdmin = new ItemsService('ventas', {
            schema,
            database: database
            // No accountability = admin access (bypassing field permissions)
        });

        let ventas = [];
        try {
            ventas = await ventasServiceAdmin.readByQuery({
                filter: { cliente_id: { _eq: targetClienteId } },
                fields: [
                    '*',
                    'lote_id.numero_lote',
                    'lote_id.manzana',
                    'pagos.id',
                    'pagos.fecha_pago',
                    'pagos.monto',
                    'pagos.concepto',
                    'pagos.estatus',
                    'pagos.numero_parcialidad',
                    'pagos.interes',
                    'pagos.capital',
                    'pagos.saldo_restante',
                    'pagos.fecha_vencimiento',
                    'pagos.venta_id'
                ]
            });
        } catch (ventasError) {
            console.error('[Perfil] Error fetching ventas with pagos (Admin context):', ventasError.message);
            // Fallback to user context if admin fails for some reason (unlikely)
             console.log('[Perfil] Retrying with user context (might miss fields)...');
             try {
                const ventasServiceUser = new ItemsService('ventas', {
                    schema,
                    database,
                    accountability: req.accountability
                });
                ventas = await ventasServiceUser.readByQuery({
                    filter: { cliente_id: { _eq: targetClienteId } },
                    fields: [
                        '*',
                        'lote_id.numero_lote',
                        'lote_id.manzana'
                    ]
                });
             } catch (retryError) {
                 console.error('[Perfil] Retry failed:', retryError.message);
             }
        }

        cliente.ventas = ventas;

        console.log(`[Perfil] Client loaded. Ventas count: ${cliente.ventas?.length || 0}`);
        if (cliente.ventas?.length > 0) {
            console.log(`[Perfil] First venta ID: ${cliente.ventas[0].id}`);
            console.log(`[Perfil] Pagos in first venta: ${cliente.ventas[0].pagos?.length || 0}`);
        }

        // 5. Calcular estadísticas
        const stats = await calcularEstadisticasCliente(targetClienteId, database);

        const responseData = {
            perfil: cliente,
            estadisticas: stats,
            timestamp: new Date().toISOString(),
            source: 'database'
        };

        // 6. Almacenar en caché
        setCachedPerfil(targetClienteId, responseData);

        res.json(responseData);
      } catch (readError) {
          console.error('[Perfil] Error reading client:', readError);
          // If 403, it means permission denied
          if (readError.status === 403) {
              return res.status(403).json({ error: 'Permiso denegado para ver este perfil' });
          }
          throw readError;
      }
    } catch (error) {
      console.error('❌ Error en GET /perfil:', error);
      return res.status(500).json({ error: error.message });
    }
  });
};

async function calcularEstadisticasCliente(clienteId, knex) {
    // Implementación básica basada en lo que se espera
    // Buscar ventas y pagos
    try {
        const ventas = await knex('ventas').where({ cliente_id: clienteId });
        const pagos = await knex('pagos')
            .join('ventas', 'pagos.venta_id', 'ventas.id')
            .where('ventas.cliente_id', clienteId);

        const totalComprado = ventas.reduce((acc, v) => acc + (parseFloat(v.monto_total) || 0), 0);
        const totalPagado = pagos.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0);
        const lotesCount = ventas.length;
        const pagosCount = pagos.length;

        return {
            total_compras: totalComprado,
            total_pagado: totalPagado,
            saldo_pendiente: totalComprado - totalPagado,
            numero_ventas: lotesCount,
            pagos_realizados: pagosCount,
            proximo_pago: {
                monto: 0,
                estatus: 'pendiente',
                fecha_pago: new Date().toISOString()
            }
        };
    } catch (e) {
        console.error("Error calculando estadisticas:", e);
        return {
            total_compras: 0,
            total_pagado: 0,
            saldo_pendiente: 0,
            numero_ventas: 0,
            pagos_realizados: 0
        };
    }
}

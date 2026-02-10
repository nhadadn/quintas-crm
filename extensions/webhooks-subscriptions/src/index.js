import { createOAuthMiddleware, requireScopes } from '../../middleware/oauth-auth.mjs';
import crypto from 'crypto';

export default (router, context) => {
  const { services, getSchema } = context;
  const { ItemsService } = services;

  // 1. Validar Access Token
  router.use(createOAuthMiddleware(context));

  // =================================================================================
  // POST / (Crear Subscription)
  // =================================================================================
  router.post('/', async (req, res) => {
    try {
      const { event_type, url, secret } = req.body;

      // Validaciones básicas
      if (!event_type || !url) {
        return res
          .status(400)
          .json({ errors: [{ message: 'Missing required fields: event_type, url' }] });
      }

      // Validar URL
      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          throw new Error('Invalid protocol');
        }
      } catch (e) {
        return res.status(400).json({ errors: [{ message: 'Invalid URL format' }] });
      }

      // Generar Secret si no viene
      const finalSecret = secret || crypto.randomBytes(32).toString('hex');

      // Obtener client_id del token
      const clientId = req.oauth?.client_id;
      const userId = req.oauth?.user_id;

      if (!clientId) {
        // Si no hay client_id (ej. auth por usuario directo sin app OAuth),
        // podríamos fallar o asociarlo a una "app default".
        // El prompt dice "client_id (string, FK a oauth_clients)".
        // Si el token es de usuario (Password Flow), puede no tener client_id asociado a la sesión si no se usó cliente.
        // Asumiremos que el middleware OAuth extrae client_id si está presente.
        // Si es nulo, retornar error 400.
        return res.status(400).json({ errors: [{ message: 'OAuth Client context required' }] });
      }

      const schema = await getSchema();
      const subscriptionsService = new ItemsService('webhooks_subscriptions', {
        schema,
        accountability: req.accountability,
      });

      const newSubscription = {
        client_id: clientId,
        event_type,
        url,
        secret: finalSecret,
        is_active: true,
        created_by: userId,
      };

      const createdId = await subscriptionsService.createOne(newSubscription);

      // Retornar respuesta (secret solo se muestra aquí)
      res.status(201).json({
        data: {
          id: createdId,
          event_type,
          url,
          secret: finalSecret, // Mostrar solo una vez
          is_active: true,
          created_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Error en POST /webhooks/subscriptions:', error);
      res.status(500).json({ errors: [{ message: error.message }] });
    }
  });

  // =================================================================================
  // GET / (Listar Subscriptions)
  // =================================================================================
  router.get('/', async (req, res) => {
    try {
      const { event_type, is_active } = req.query;
      const clientId = req.oauth?.client_id;

      if (!clientId) {
        return res.status(400).json({ errors: [{ message: 'OAuth Client context required' }] });
      }

      const schema = await getSchema();
      const subscriptionsService = new ItemsService('webhooks_subscriptions', {
        schema,
        accountability: req.accountability,
      });

      const filter = {
        _and: [
          { client_id: { _eq: clientId } }, // Filtrar por cliente del token
        ],
      };

      if (event_type) filter._and.push({ event_type: { _eq: event_type } });
      if (is_active !== undefined) filter._and.push({ is_active: { _eq: is_active === 'true' } });

      const items = await subscriptionsService.readByQuery({
        filter,
        fields: [
          'id',
          'event_type',
          'url',
          'is_active',
          'last_success_at',
          'last_failure_at',
          'failure_count',
        ],
        // NO retornar secret
      });

      res.json({ data: items });
    } catch (error) {
      console.error('❌ Error en GET /webhooks/subscriptions:', error);
      res.status(500).json({ errors: [{ message: error.message }] });
    }
  });

  // =================================================================================
  // DELETE /:id (Desactivar Subscription)
  // =================================================================================
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const clientId = req.oauth?.client_id;

      if (!clientId) {
        return res.status(400).json({ errors: [{ message: 'OAuth Client context required' }] });
      }

      const schema = await getSchema();
      const subscriptionsService = new ItemsService('webhooks_subscriptions', {
        schema,
        accountability: req.accountability,
      });

      // Verificar propiedad
      const existing = await subscriptionsService.readOne(id);
      if (!existing) {
        return res.status(404).json({ errors: [{ message: 'Subscription not found' }] });
      }

      if (existing.client_id !== clientId) {
        return res.status(403).json({ errors: [{ message: 'Forbidden' }] });
      }

      // Soft Delete (is_active = false)
      await subscriptionsService.updateOne(id, { is_active: false });

      res.status(204).send();
    } catch (error) {
      console.error(`❌ Error en DELETE /webhooks/subscriptions/${req.params.id}:`, error);
      res.status(500).json({ errors: [{ message: error.message }] });
    }
  });
};

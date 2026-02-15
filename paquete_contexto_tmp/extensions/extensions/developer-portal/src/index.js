import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
console.log('LOADING DEVELOPER PORTAL EXTENSION - PRODUCTION READY');
console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

export default (router, context) => {
  const { database } = context;

  console.log('REGISTERING DEVELOPER PORTAL ROUTES');

  // Health check
  router.get('/ping', (req, res) => {
    res.send('pong');
  });

  // Register new OAuth App
  router.post('/register-app', async (req, res) => {
    // Ensure user is authenticated
    if (!req.accountability || !req.accountability.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { name, redirect_uris, scopes } = req.body;

    if (!name || !redirect_uris) {
      return res.status(400).json({ error: 'Missing required fields: name, redirect_uris' });
    }

    try {
      const id = uuidv4();
      const clientId = uuidv4();
      const clientSecret = crypto.randomBytes(32).toString('hex');

      const payload = {
        id: id,
        client_id: clientId,
        client_secret: clientSecret,
        name: name,
        redirect_uris: JSON.stringify(redirect_uris),
        scopes: scopes ? JSON.stringify(scopes) : null,
        user_created: req.accountability.user,
        status: 'published',
      };

      await database('oauth_clients').insert(payload);

      // Return wrapped in 'data' to follow Directus standards
      res.json({
        data: {
          client_id: clientId,
          client_secret: clientSecret,
          name: name,
          redirect_uris: redirect_uris,
          scopes: scopes || [],
        },
      });
    } catch (error) {
      console.error('Error registering app:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  });
};

console.log('!!! OAUTH EXTENSION LOADING - START !!!');

export default (router, context) => {
  console.log('!!! OAUTH EXTENSION REGISTERING ROUTES !!!');

  router.get('/ping', (req, res) => {
    console.log('Ping endpoint hit');
    res.send('pong');
  });

  router.get('/authorize', (req, res) => {
    console.log('Authorize endpoint hit');
    const params = { ...req.query, ...req.body };

    if (!params.client_id) return res.status(400).json({ error: 'Missing client_id' });

    // Simulate code generation
    const code = 'auth_code_' + Math.random().toString(36).substring(7);
    const redirectTo = `${params.redirect_uri}?code=${code}&state=${params.state}`;

    res.json({
      redirect_to: redirectTo,
    });
  });

  router.post('/token', (req, res) => {
    console.log('Token endpoint hit');
    const { grant_type, code, refresh_token } = req.body;

    if (grant_type === 'authorization_code') {
      if (!code) return res.status(400).json({ error: 'Missing code' });
      res.json({
        access_token: 'mock_access_token_' + Date.now(),
        refresh_token: 'mock_refresh_token_' + Date.now(),
        expires_in: 3600,
      });
    } else if (grant_type === 'refresh_token') {
      if (!refresh_token) return res.status(400).json({ error: 'Missing refresh_token' });
      res.json({
        access_token: 'mock_new_access_token_' + Date.now(),
        refresh_token: 'mock_new_refresh_token_' + Date.now(),
        expires_in: 3600,
      });
    } else {
      res.status(400).json({ error: 'Unsupported grant_type' });
    }
  });

  // Protected endpoint to verify token
  router.get('/me', (req, res) => {
    // Use X-Custom-Auth to avoid Directus Core stripping invalid Authorization headers
    const authHeader = req.headers['x-custom-auth'] || req.headers['authorization'];

    console.log('Headers received in /me:', JSON.stringify(req.headers));

    if (!authHeader || !authHeader.startsWith('Bearer mock_')) {
      return res.status(401).json({ error: 'Unauthorized', received: authHeader });
    }
    res.json({
      id: 'mock_user_id',
      name: 'Mock User',
      email: 'mock@example.com',
    });
  });
};

export default ({ init }, { env, services, database, getSchema }) => {
  init('middlewares.before', async function ({ app }) {
    console.log('!!! MIDDLEWARE EXTENSION LOADED !!!');
    
    // Import and usage of oauth-auth logic is disabled for safety until verified.
    // To enable, uncomment the lines below and ensure oauth-auth.mjs handles standard Directus tokens correctly without conflict.
    
    /*
    const { createOAuthMiddleware } = await import('./oauth-auth.mjs');
    const middleware = createOAuthMiddleware({ services, database, getSchema, env });
    app.use(middleware);
    */
  });
};

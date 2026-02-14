export default ({ init }, { env, services, database, getSchema }) => {
  init('middlewares.before', async function ({ app }) {
    console.log('!!! MIDDLEWARE EXTENSION LOADED !!!');

    const { createOAuthMiddleware } = await import('./oauth-auth.mjs');
    const middleware = createOAuthMiddleware({ services, database, getSchema, env });
    app.use(middleware);
  });
};

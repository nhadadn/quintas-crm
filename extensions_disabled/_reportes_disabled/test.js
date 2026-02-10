export default (router) => {
  console.log('TEST ROUTER CALLED (ESM)');
  router.get('/test', (req, res) => res.send('OK ESM'));
  router.get('/', (req, res) => res.send('ROOT OK ESM'));
};

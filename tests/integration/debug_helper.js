
const { getAuthToken } = require('./helpers/request');

(async () => {
  try {
    console.log('Testing getAuthToken...');
    const token = await getAuthToken('admin@quintas.com', 'admin_quintas_2024');
    console.log('Token received:', token ? 'Yes' : 'No');
  } catch (e) {
    console.error('Debug Error:', e);
  }
})();

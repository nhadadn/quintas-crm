const { requestDirectus } = require('./helpers/request');

module.exports = async () => {
  console.log('Global Setup: Checking Directus connectivity...');
  try {
    const res = await requestDirectus.get('/server/ping');
    if (res.status === 200) {
      console.log('✅ Directus is running!');
    } else {
      console.warn(`⚠️ Directus returned status ${res.status}`);
    }
  } catch (error) {
    console.error('❌ Directus is NOT reachable. Please ensure it is running on port 8055.');
    // We usually want tests to fail fast if the environment isn't ready
    // throw error;
  }
};

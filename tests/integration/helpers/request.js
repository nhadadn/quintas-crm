const supertest = require('supertest');

const DIRECTUS_URL = process.env.TEST_DIRECTUS_URL || 'http://localhost:8055';
const FRONTEND_URL = process.env.TEST_FRONTEND_URL || 'http://localhost:3000';

const requestDirectus = supertest(DIRECTUS_URL);
const requestFrontend = supertest(FRONTEND_URL);

/**
 * Helper to authenticate against Directus
 * @param {string} email
 * @param {string} password
 * @returns {Promise<string>} Access Token
 */
const getAuthToken = async (email, password) => {
  try {
    const res = await requestDirectus.post('/auth/login').send({ email, password });

    if (res.body && res.body.data && res.body.data.access_token) {
      return res.body.data.access_token;
    }
    throw new Error(`Authentication failed: ${JSON.stringify(res.body)}`);
  } catch (error) {
    console.error('Auth Error:', error.message);
    throw error;
  }
};

/**
 * Helper to create test data in Directus
 * @param {string} collection
 * @param {object} data
 * @param {string} token
 */
const createItem = async (collection, data, token) => {
  const res = await requestDirectus
    .post(`/items/${collection}`)
    .set('Authorization', `Bearer ${token}`)
    .send(data);

  if (!res.body || !res.body.data) {
    console.error(`Failed to create item in ${collection}:`, JSON.stringify(res.body));
    // Log more details about the request
    console.error('Request Data:', JSON.stringify(data));
    throw new Error(`Failed to create item in ${collection}`);
  }
  return res.body.data;
};

/**
 * Helper to delete test data in Directus
 * @param {string} collection
 * @param {string|number} id
 * @param {string} token
 */
const deleteItem = async (collection, id, token) => {
  if (!id) return;
  try {
    const res = await requestDirectus
      .delete(`/items/${collection}/${id}`)
      .set('Authorization', `Bearer ${token}`);

    if (res.status !== 204) {
      console.warn(`⚠️ Failed to delete item ${id} from ${collection}. Status: ${res.status}`);
    }
  } catch (error) {
    console.error(`❌ Error deleting item ${id} from ${collection}:`, error.message);
  }
};

module.exports = {
  requestDirectus,
  requestFrontend,
  getAuthToken,
  createItem,
  deleteItem,
  DIRECTUS_URL,
};

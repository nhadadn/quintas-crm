import axios from 'axios';

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://127.0.0.1:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@quintas.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin_quintas_2024';

async function main() {
  try {
    const loginRes = await axios.post(`${DIRECTUS_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    const token = loginRes.data?.data?.access_token;
    if (!token) throw new Error('No token obtained');
    const headers = { Authorization: `Bearer ${token}` };

    const me = await axios.get(`${DIRECTUS_URL}/users/me`, { headers });
    console.log('Me:', me.data);

    const r = await axios.get(`${DIRECTUS_URL}/items/v_dashboard_kpis`, {
      headers,
      params: { limit: 1 },
    });
    console.log('v_dashboard_kpis:', r.data);
  } catch (e) {
    if (e.response) {
      console.error('Status:', e.response.status);
      console.error('Data:', JSON.stringify(e.response.data, null, 2));
    } else {
      console.error(e.message);
    }
  }
}

main();

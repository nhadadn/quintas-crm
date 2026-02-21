import axios from 'axios';
import 'dotenv/config';

const DIRECTUS_URL = process.env.DIRECTUS_INTERNAL_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const STATIC = process.env.DIRECTUS_STATIC_TOKEN || '';
const SESSION = process.env.SESSION_TEST_TOKEN || ''; // opcional, si el usuario quiere probar con token de sesión

async function req(token, path, params = {}) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await axios.get(`${DIRECTUS_URL}${path}`, { headers, params });
    console.log(`→ GET ${path} ${res.status}`);
    const data = res.data;
    if (Array.isArray(data?.data)) {
      console.log(`${path} entries:`, data.data.length);
      if (data.data[0]) console.log('sample:', JSON.stringify(data.data[0]).slice(0, 200));
    } else {
      console.log(`${path} response keys:`, Object.keys(data || {}));
    }
  } catch (e) {
    const status = e?.response?.status || 'ERR';
    const data = e?.response?.data;
    const firstError = Array.isArray(data?.errors) ? data.errors[0] : undefined;
    console.log(`→ GET ${path} ${status}`, firstError?.message || e?.message);
    if (firstError?.extensions) console.log('extensions:', firstError.extensions);
  }
}

async function main() {
  console.log('== Probe with SESSION token ==', SESSION ? 'present' : 'missing');
  if (SESSION) {
    await req(SESSION, '/items/v_dashboard_kpis', { limit: 1 });
    await req(SESSION, '/collections/v_dashboard_kpis');
    await req(SESSION, '/fields/v_dashboard_kpis');
  }
  console.log('== Probe with STATIC token ==', STATIC ? 'present' : 'missing');
  if (STATIC) {
    await req(STATIC, '/items/v_dashboard_kpis', { limit: 1 });
    await req(STATIC, '/collections/v_dashboard_kpis');
    await req(STATIC, '/fields/v_dashboard_kpis');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


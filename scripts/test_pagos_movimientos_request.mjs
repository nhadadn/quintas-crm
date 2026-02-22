import axios from 'axios';
import 'dotenv/config';
async function main() {
  const baseUrl =
    process.env.DIRECTUS_URL ||
    process.env.PUBLIC_URL ||
    'http://localhost:8055';
  const token =
    process.env.DIRECTUS_ADMIN_TOKEN ||
    process.env.DIRECTUS_STATIC_TOKEN ||
    'quintas_admin_token_2026';

  const url = `${baseUrl.replace(/\/+$/, '')}/items/pagos_movimientos`;
  const params = {
    'filter[venta_id][_eq]': 'TEST',
    limit: 1,
  };

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  try {
    const resp = await axios.get(url, { params, headers, validateStatus: () => true });
    if (resp.status === 400) {
      console.error('❌ Respuesta 400. Detalle:', resp.data);
      process.exitCode = 1;
      return;
    }
    console.log('✅ GET /items/pagos_movimientos no devolvió error 400');
    console.log('ℹ️ Status:', resp.status);
  } catch (e) {
    console.error('❌ Error ejecutando request a Directus:', e?.response?.data || e.message);
    process.exitCode = 1;
  }
}

main();

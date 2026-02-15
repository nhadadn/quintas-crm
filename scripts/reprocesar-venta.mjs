// Ejecuta reintento de post-proceso para una venta usando el endpoint protegido
// Uso:
//   set DIRECTUS_URL=http://localhost:8055
//   set CRM_TOKEN=<Bearer token con scope write:ventas>
//   node scripts/reprocesar-venta.mjs bfee7866-ef30-46d3-987e-3be1dd3b334e
import axios from 'axios';

async function main() {
  const ventaId = process.argv[2];
  if (!ventaId) {
    console.error('Uso: node scripts/reprocesar-venta.mjs <ventaId>');
    process.exit(1);
  }
  const baseUrl = process.env.DIRECTUS_URL || 'http://localhost:8055';
  const token = process.env.CRM_TOKEN || process.env.NEXT_PUBLIC_DIRECTUS_STATIC_TOKEN;
  if (!token) {
    console.error('Falta token: define CRM_TOKEN o NEXT_PUBLIC_DIRECTUS_STATIC_TOKEN');
    process.exit(1);
  }

  const url = `${baseUrl}/api/v1/ventas/reprocesar/${ventaId}`;
  try {
    const res = await axios.post(
      url,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      },
    );
    console.log('Reproceso OK:', res.status, res.data);
  } catch (e) {
    const status = e.response?.status;
    const data = e.response?.data;
    console.error('Reproceso FALLÓ:', status, data || e.message);
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});


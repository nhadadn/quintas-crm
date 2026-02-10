// scripts/inspect_ventas_id.mjs
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function inspectVentasId() {
    console.log('--- Inspecting Ventas ID Field ---');
    
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    
    const { data: { access_token } } = await loginRes.json();
    const headers = { Authorization: `Bearer ${access_token}` };

    const res = await fetch(`${DIRECTUS_URL}/fields/ventas/id`, { headers });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

inspectVentasId();

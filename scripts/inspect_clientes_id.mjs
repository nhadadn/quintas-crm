// scripts/inspect_clientes_id.mjs
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function inspectClientesId() {
    console.log('--- Inspecting Clientes ID Field ---');
    
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    
    const { data: { access_token } } = await loginRes.json();
    const headers = { Authorization: `Bearer ${access_token}` };

    const res = await fetch(`${DIRECTUS_URL}/fields/clientes/id`, { headers });
    if (res.status === 403) {
        console.log('Permission denied reading field info');
        return;
    }
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

inspectClientesId();

// scripts/inspect_ventas_fk.mjs
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function inspectVentasFK() {
    console.log('--- Inspecting Ventas Vendedor_ID Field ---');
    
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    
    const { data: { access_token } } = await loginRes.json();
    const headers = { Authorization: `Bearer ${access_token}` };

    const res = await fetch(`${DIRECTUS_URL}/fields/ventas/vendedor_id`, { headers });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));

    // Also check relations
    console.log('\n--- Inspecting Relations ---');
    const relRes = await fetch(`${DIRECTUS_URL}/relations/ventas`, { headers });
    const relData = await relRes.json();
    const relation = relData.data.find(r => r.field === 'vendedor_id');
    console.log(JSON.stringify(relation, null, 2));
}

inspectVentasFK();

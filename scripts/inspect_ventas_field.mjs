// scripts/inspect_ventas_field.mjs
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function inspect() {
    console.log('--- Inspecting Ventas ID Field ---');
    
    // Login
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    const { data: { access_token } } = await loginRes.json();
    
    // Get Field
    const res = await fetch(`${DIRECTUS_URL}/fields/ventas/id`, {
        headers: { Authorization: `Bearer ${access_token}` }
    });
    
    if (res.ok) {
        const field = (await res.json()).data;
        console.log(JSON.stringify(field, null, 2));
    } else {
        console.log('Error fetching field:', res.status, res.statusText);
    }

    // Get Collection info to check PK
    const colRes = await fetch(`${DIRECTUS_URL}/collections/ventas`, {
        headers: { Authorization: `Bearer ${access_token}` }
    });
    if (colRes.ok) {
        const col = (await colRes.json()).data;
        console.log('\nCollection Info (PK):', col.schema?.primary_key);
    }
}

inspect();

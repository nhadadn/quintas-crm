import fetch from 'node-fetch';

const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function inspectVendedores() {
    console.log('--- Inspecting Vendedores Collection ---');
    
    // 1. Login
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    
    if (!loginRes.ok) {
        console.error('Login failed');
        return;
    }

    const { data: { access_token } } = await loginRes.json();
    const headers = { Authorization: `Bearer ${access_token}` };

    // 2. Get Fields
    const fieldsRes = await fetch(`${DIRECTUS_URL}/fields/vendedores`, { headers });
    const fieldsData = await fieldsRes.json();
    
    if (fieldsData.errors) {
        console.error('Error fetching fields:', JSON.stringify(fieldsData.errors, null, 2));
        return;
    }

    console.log('Fields in vendedores:');
    fieldsData.data.forEach(f => {
        console.log(`- ${f.field} (${f.type})`);
    });
}

inspectVendedores();

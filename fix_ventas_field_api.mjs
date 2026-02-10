// fix_ventas_field_api.mjs
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function fixVentasField() {
    console.log('--- Fixing Ventas ID Field via API ---');
    
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
    const headers = { 
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
    };

    // 2. Check existing field
    console.log('Checking field...');
    const fieldRes = await fetch(`${DIRECTUS_URL}/fields/ventas/id`, { headers });
    
    const fieldConfig = {
        "special": ["uuid"],
        "interface": "input",
        "readonly": true,
        "hidden": false,
        "width": "full"
    };

    if (fieldRes.ok) {
        console.log('Updating existing field...');
        const updateRes = await fetch(`${DIRECTUS_URL}/fields/ventas/id`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(fieldConfig)
        });
        console.log('Update status:', updateRes.status);
        if (!updateRes.ok) console.log(await updateRes.json());
    } else {
        console.log('Creating field (should exist usually)...');
        const createRes = await fetch(`${DIRECTUS_URL}/fields/ventas`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                field: 'id',
                type: 'uuid',
                schema: { is_primary_key: true },
                ...fieldConfig
            })
        });
        console.log('Create status:', createRes.status);
        if (!createRes.ok) console.log(await createRes.json());
    }
}

fixVentasField();

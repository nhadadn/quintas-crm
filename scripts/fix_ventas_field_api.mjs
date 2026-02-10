
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
        "width": "full",
        "required": false
    };

    let needsCreation = true;
    if (fieldRes.ok) {
        const current = await fieldRes.json();
        console.log('Current field meta:', current.data.meta);
        if (current.data.meta) {
            needsCreation = false;
        }
    }

    if (!needsCreation) {
        console.log('Updating existing field config...');
        const updateRes = await fetch(`${DIRECTUS_URL}/fields/ventas/id`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(fieldConfig)
        });
        console.log('Update status:', updateRes.status);
        if (!updateRes.ok) console.log(await updateRes.json());
    } else {
        console.log('Creating field config (registering existing column)...');
        // If column exists but meta is null, we need to POST to register it
        const createRes = await fetch(`${DIRECTUS_URL}/fields/ventas`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                field: 'id',
                type: 'uuid',
                schema: { is_primary_key: true },
                meta: fieldConfig
            })
        });
        console.log('Create status:', createRes.status);
        if (!createRes.ok) {
             const err = await createRes.json();
             console.log(JSON.stringify(err, null, 2));
             // If it fails saying field exists, try PATCH anyway (fallback)
             if (err.errors?.[0]?.code === 'FIELD_ALREADY_EXISTS' || err.errors?.[0]?.code === 'INVALID_PAYLOAD') {
                 console.log('Field exists error, trying PATCH fallback...');
                 const patchRes = await fetch(`${DIRECTUS_URL}/fields/ventas/id`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify(fieldConfig)
                });
                console.log('Fallback Patch status:', patchRes.status);
             }
        }
    }
}

fixVentasField();

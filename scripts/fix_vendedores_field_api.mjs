// scripts/fix_vendedores_field_api.mjs
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function fixVendedoresField() {
    console.log('--- Fixing Vendedores ID Field via API ---');
    
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

    // 2. Define field config for ID
    const fieldConfig = {
        field: "id",
        type: "uuid",
        schema: {
            is_primary_key: true,
            has_auto_increment: false,
            max_length: 36
        },
        meta: {
            hidden: true,
            readonly: true,
            interface: "input",
            special: ["uuid"],
            width: "full",
            required: false // Important so Directus generates it
        }
    };

    console.log('Attempting to create/update "id" field on "vendedores"...');

    // Try creating first (if it doesn't exist in Directus metadata)
    const createRes = await fetch(`${DIRECTUS_URL}/fields/vendedores`, {
        method: 'POST',
        headers,
        body: JSON.stringify(fieldConfig)
    });

    if (createRes.ok) {
        console.log('✅ Field "id" created successfully.');
    } else {
        const err = await createRes.json();
        const code = err.errors?.[0]?.code || err.errors?.[0]?.extensions?.code;
        
        // If it exists, try updating (PATCH)
        if (code === 'FIELD_ALREADY_EXISTS' || code === 'INVALID_PAYLOAD') {
            console.log('Field exists error, trying PATCH fallback...');
            
            // For PATCH, we send meta and schema separately usually, but let's try sending the whole object excluding 'field' and 'type' if needed, 
            // but Directus PATCH /fields/:collection/:field takes the partial object.
            
            const patchPayload = {
                meta: fieldConfig.meta,
                type: fieldConfig.type
                // schema: fieldConfig.schema // Omit schema to avoid "Multiple primary key" error
            };

            const patchRes = await fetch(`${DIRECTUS_URL}/fields/vendedores/id`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(patchPayload)
            });

            if (patchRes.ok) {
                console.log('✅ Field "id" updated (PATCH) successfully.');
            } else {
                const patchErr = await patchRes.json();
                console.error('❌ Failed to PATCH field:', JSON.stringify(patchErr, null, 2));
            }
        } else {
            console.error('❌ Failed to create field:', JSON.stringify(err, null, 2));
        }
    }
}

fixVendedoresField();

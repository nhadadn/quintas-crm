// scripts/force_ventas_meta.mjs
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function forceVentasMeta() {
    console.log('--- Forcing Ventas ID Meta Update (Meta Only) ---');
    
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    
    const { data: { access_token } } = await loginRes.json();
    const headers = { 
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
    };

    const metaPayload = {
        meta: {
            collection: "ventas",
            field: "id",
            special: ["uuid"],
            interface: "input",
            readonly: true,
            hidden: true,
            width: "full",
            required: false
        },
        type: "uuid" // Ensure Directus treats it as UUID type
    };

    console.log('Patching fields/ventas/id...');
    const res = await fetch(`${DIRECTUS_URL}/fields/ventas/id`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(metaPayload)
    });

    if (res.ok) {
        const data = await res.json();
        console.log('✅ Meta updated successfully');
        console.log('New Meta:', JSON.stringify(data.data.meta, null, 2));
    } else {
        const err = await res.text();
        console.error('❌ Failed to update meta:', err);
    }
}

forceVentasMeta();

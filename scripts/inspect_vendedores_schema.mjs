// scripts/inspect_vendedores_schema.mjs
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function inspectVendedores() {
    console.log('--- Inspecting Vendedores Schema ---');
    
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    
    const { data: { access_token } } = await loginRes.json();
    const headers = { Authorization: `Bearer ${access_token}` };

    const res = await fetch(`${DIRECTUS_URL}/fields/vendedores`, { headers });
    const data = await res.json();
    
    if (data.data) {
        console.log('Fields in vendedores collection:');
        data.data.forEach(field => {
            console.log(`- ${field.field} (${field.type})`);
            if (field.field === 'user_id' || field.field === 'usuario_id' || field.field === 'directus_user') {
                 console.log('  RELATION DETAILS:', JSON.stringify(field, null, 2));
            }
        });
    } else {
        console.log('No fields found or error:', JSON.stringify(data, null, 2));
    }
}

inspectVendedores();

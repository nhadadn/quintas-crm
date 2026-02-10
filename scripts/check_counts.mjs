// scripts/check_counts.mjs
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function checkCounts() {
    console.log('--- Checking Counts ---');
    
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

    const collections = ['lotes', 'clientes', 'users']; // users is system collection, endpoint /users

    for (const col of collections) {
        const url = col === 'users' ? `${DIRECTUS_URL}/users?limit=1` : `${DIRECTUS_URL}/items/${col}?limit=1`;
        const res = await fetch(url, { headers });
        const data = await res.json();
        console.log(`${col} count: ${data.data?.length}`);
        if (data.data?.length > 0) {
            console.log(`First ${col} ID: ${data.data[0].id}`);
            if (col === 'clientes') {
                console.log('Full client object:', JSON.stringify(data.data[0], null, 2));
            }
        }
    }
}

checkCounts();

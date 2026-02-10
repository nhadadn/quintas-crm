// scripts/check_admin_role.mjs
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

console.log('Starting script...');

async function checkAdmin() {
    console.log('--- Checking Admin Role ---');
    
    try {
        const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });
        
        if (!loginRes.ok) {
            console.error('Login failed', loginRes.status);
            const txt = await loginRes.text();
            console.error(txt);
            return;
        }
        
        const { data: { access_token } } = await loginRes.json();
        console.log('Token obtained');
        
        const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields=id,email,role.name,role.id`, {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        
        const me = (await meRes.json()).data;
        console.log('Admin User:', JSON.stringify(me, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}

checkAdmin();

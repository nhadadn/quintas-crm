import fetch from 'node-fetch';

const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function listUsers() {
    console.log('--- Listing All Users ---');
    
    // 1. Admin Login
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    
    if (!loginRes.ok) {
        console.error('Admin Login failed');
        return;
    }

    const { data: { access_token } } = await loginRes.json();
    const headers = { Authorization: `Bearer ${access_token}` };

    // 2. Get Users
    const usersRes = await fetch(`${DIRECTUS_URL}/users?fields=id,first_name,last_name,email,role.name`, { headers });
    const usersData = await usersRes.json();
    
    console.log('Users found:', usersData.data.length);
    usersData.data.forEach(u => {
        console.log(`- ${u.first_name} ${u.last_name} (${u.email}) [Role: ${u.role?.name || 'None'}]`);
    });
}

listUsers();

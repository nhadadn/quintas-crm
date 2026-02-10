
const fetch = require('node-fetch');

const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function linkClientUser() {
    console.log('🚀 Linking QA Client User to Client Record...');

    // 1. Login as Admin
    let token;
    try {
        const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });
        
        if (!loginRes.ok) throw new Error(`Admin login failed: ${loginRes.statusText}`);
        const data = await loginRes.json();
        token = data.data.access_token;
        console.log('✅ Admin Logged In');
    } catch (e) {
        console.error('❌ Error logging in:', e.message);
        return;
    }

    const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // 2. Get User ID for cliente.qa@quintas.com
    const email = 'cliente.qa@quintas.com';
    let userId;
    try {
        const userRes = await fetch(`${DIRECTUS_URL}/users?filter[email][_eq]=${email}`, { headers });
        const userData = await userRes.json();
        if (userData.data.length === 0) {
            console.error(`❌ User ${email} not found! Run ensure_test_users_for_qa.js first.`);
            return;
        }
        userId = userData.data[0].id;
        console.log(`✅ User found: ${userId}`);
    } catch (e) {
        console.error('❌ Error fetching user:', e.message);
        return;
    }

    // 3. Check/Create Client Record
    try {
        // Check if client record exists for this user_id
        const clientRes = await fetch(`${DIRECTUS_URL}/items/clientes?filter[user_id][_eq]=${userId}`, { headers });
        const clientData = await clientRes.json();

        if (clientData.data.length > 0) {
            console.log(`✅ Client record already exists for user ${userId}`);
        } else {
            // Create client record
            const createRes = await fetch(`${DIRECTUS_URL}/items/clientes`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    nombre: 'Cliente',
                    apellido_paterno: 'QA Test',
                    email: email,
                    telefono: '555-000-0001',
                    user_id: userId,
                    estatus: 'activo'
                })
            });
            
            if (!createRes.ok) {
                const err = await createRes.json();
                throw new Error(JSON.stringify(err));
            }
            console.log(`✅ Created new Client record for user ${userId}`);
        }

    } catch (e) {
        console.error('❌ Error managing client record:', e.message);
    }
}

linkClientUser();

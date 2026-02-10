
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function checkMapAccess() {
  console.log('Checking Admin Map Access...');
  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    
    if (!loginRes.ok) throw new Error(`Login failed: ${await loginRes.text()}`);
    
    const { data: { access_token } } = await loginRes.json();
    console.log('Logged in successfully.');

    // 2. Fetch User Role Details (including admin_access)
    // Note: directus_roles has field 'admin_access'
    const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields=role.name,role.id,role.admin_access`, {
        headers: { Authorization: `Bearer ${access_token}` }
    });
    const meData = await meRes.json();
    console.log('User Role Data:', JSON.stringify(meData.data, null, 2));

    // 3. Try to fetch lotes again
    console.log('Fetching lotes...');
    const lotesRes = await fetch(`${DIRECTUS_URL}/items/lotes?limit=1`, {
        headers: { Authorization: `Bearer ${access_token}` }
    });

    if (lotesRes.ok) {
        console.log('✅ Admin can access lotes.');
    } else {
        console.log(`❌ Admin CANNOT access lotes: ${lotesRes.status} ${lotesRes.statusText}`);
        const text = await lotesRes.text();
        console.log('Error Body:', text);
    }
    
    // 4. List extensions (if possible via API, otherwise I check file system)
    // Directus doesn't have a public endpoint to list extensions usually, 
    // unless I check /server/info as admin.
    const infoRes = await fetch(`${DIRECTUS_URL}/server/info`, {
        headers: { Authorization: `Bearer ${access_token}` }
    });
    if (infoRes.ok) {
        console.log('Server Info accessed.');
    } else {
        console.log('Cannot access server info.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkMapAccess();

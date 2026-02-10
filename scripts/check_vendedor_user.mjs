
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function checkVendedorUser() {
    try {
        console.log('--- Checking Vendedor User ---');
        
        // 1. Login
        const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });
        
        if (!loginRes.ok) {
            console.error('Login failed', await loginRes.text());
            return;
        }
        
        const { data: { access_token } } = await loginRes.json();
        const headers = { Authorization: `Bearer ${access_token}` };
        
        // 2. Find Vendedor Role
        const rolesRes = await fetch(`${DIRECTUS_URL}/roles?filter[name][_eq]=Vendedor`, { headers });
        const rolesData = await rolesRes.json();
        
        if (rolesData.data.length === 0) {
            console.error('❌ Role "Vendedor" not found.');
            return;
        }
        
        const vendedorRoleId = rolesData.data[0].id;
        console.log(`✅ Role "Vendedor" found with ID: ${vendedorRoleId}`);
        
        // 3. Find Users with this Role
        const usersRes = await fetch(`${DIRECTUS_URL}/users?filter[role][_eq]=${vendedorRoleId}`, { headers });
        const usersData = await usersRes.json();
        
        if (usersData.data.length === 0) {
            console.warn('⚠️ No users found with "Vendedor" role.');
        } else {
            console.log(`✅ Found ${usersData.data.length} user(s) with "Vendedor" role:`);
            usersData.data.forEach(u => {
                console.log(`   - Name: ${u.first_name} ${u.last_name}`);
                console.log(`     Email: ${u.email}`);
                console.log(`     ID: ${u.id}`);
                console.log(`     Status: ${u.status}`);
            });
        }

        // 4. Verify Vendedor Collection Mapping (user_id)
        // We want to see if there is a 'vendedores' item that links to this user
        if (usersData.data.length > 0) {
            const firstUser = usersData.data[0];
            console.log(`\nChecking mapping for user ${firstUser.id} in 'vendedores' collection...`);
            
            const vendedoresRes = await fetch(`${DIRECTUS_URL}/items/vendedores?filter[user_id][_eq]=${firstUser.id}`, { headers });
            
            if (vendedoresRes.ok) {
                const vendedoresData = await vendedoresRes.json();
                if (vendedoresData.data.length > 0) {
                    console.log(`✅ User mapped to Vendedor entity:`, vendedoresData.data[0]);
                } else {
                    console.warn(`⚠️ User ${firstUser.email} exists but is NOT mapped to any 'vendedores' item via user_id.`);
                    
                    // Try to find by email if possible (if schema has email)
                    // Or just warn.
                }
            } else {
                console.warn(`⚠️ Could not query 'vendedores' collection.`, await vendedoresRes.text());
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkVendedorUser();

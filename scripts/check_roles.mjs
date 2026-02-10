// scripts/check_roles.mjs
import fetch from 'node-fetch';

const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function checkRoles() {
    console.log('--- Checking Roles and Permissions ---');
    
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
    const headers = { Authorization: `Bearer ${access_token}` };

    // 2. Get Me (to see my role)
    const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields=id,role.id,role.name,role.admin_access,email`, { headers });
    const meData = await meRes.json();
    console.log('Current User:', JSON.stringify(meData.data, null, 2));

    // 3. Get All Roles
    const rolesRes = await fetch(`${DIRECTUS_URL}/roles`, { headers });
    const rolesData = await rolesRes.json();
    
    console.log('\nAll Roles:');
    rolesData.data.forEach(r => {
        console.log(`- ${r.name} (ID: ${r.id}) [Admin Access: ${r.admin_access}]`);
    });

    // 4. Get Permissions for "Administrator" role if it exists (custom) or Vendedor
    const adminRole = rolesData.data.find(r => r.name === 'Administrator');
    if (adminRole) {
        console.log(`\nPermissions for custom Administrator role (${adminRole.id}):`);
        const permsRes = await fetch(`${DIRECTUS_URL}/permissions?filter[role][_eq]=${adminRole.id}`, { headers });
        const permsData = await permsRes.json();
        
        if (permsData.data && Array.isArray(permsData.data)) {
            permsData.data.forEach(p => {
                 console.log(`  - ${p.collection}: ${p.action} -> ${JSON.stringify(p.permissions)}`);
            });
        } else {
            console.log('Error fetching permissions or no data:', JSON.stringify(permsData, null, 2));
        }
    } else {
        console.log('\nNo custom "Administrator" role found. Built-in admins have full access.');
    }
}

checkRoles();

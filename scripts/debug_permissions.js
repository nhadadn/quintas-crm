const DIRECTUS_URL = 'http://localhost:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function debugPermissions() {
  // 1. Login
  let token;
  const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const loginData = await loginRes.json();
  token = loginData.data.access_token;
  const headers = { Authorization: `Bearer ${token}` };

  // 2. Get Vendedor Role
  const rolesRes = await fetch(`${DIRECTUS_URL}/roles?filter[name][_eq]=Vendedor`, { headers });
  const rolesData = await rolesRes.json();
  const role = rolesData.data[0];
  const roleId = role.id;
  console.log(`Role ID: ${roleId}`);
  console.log(`Role Name: ${role.name}`);
  console.log(`Role Admin Access: ${role.admin_access}`);
  console.log(`Role App Access: ${role.app_access}`);
  console.log('Role Policies:', JSON.stringify(role.policies));

  // 3. Get Policies
  if (!role.policies || role.policies.length === 0) {
    console.log('❌ Role has no policies assigned.');
  } else {
    // Policies can be array of IDs or objects depending on query?
    // By default it's IDs.
    for (const policyId of role.policies) {
      console.log(`\nChecking Policy ID: ${policyId}`);

      // Get Policy Details
      const policyRes = await fetch(`${DIRECTUS_URL}/policies/${policyId}`, { headers });
      if (policyRes.ok) {
        const policyData = await policyRes.json();
        console.log(`Policy Name: ${policyData.data.name}`);
        console.log(`Policy Admin Access: ${policyData.data.admin_access}`);
      } else {
        console.log(`Could not fetch policy details (${policyRes.status})`);
      }

      // 4. Get Permissions for this Policy
      const permRes = await fetch(`${DIRECTUS_URL}/permissions?filter[policy][_eq]=${policyId}`, {
        headers,
      });
      const permData = await permRes.json();

      console.log(`Permissions found: ${permData.data ? permData.data.length : 0}`);
      if (permData.data) {
        permData.data.forEach((p) => {
          console.log(
            `   - Collection: ${p.collection} | Action: ${p.action} | Fields: ${p.fields} | Rule: ${JSON.stringify(p.permissions)}`
          );
        });
      }
    }
  }

  // 5. Get Permissions directly on Role (Legacy check)
  const rolePermRes = await fetch(`${DIRECTUS_URL}/permissions?filter[role][_eq]=${roleId}`, {
    headers,
  });
  if (rolePermRes.ok) {
    const rolePermData = await rolePermRes.json();
    if (rolePermData.data && rolePermData.data.length > 0) {
      console.log('\n⚠️ Found Legacy Permissions directly on Role:');
      rolePermData.data.forEach((p) => {
        console.log(`   - Collection: ${p.collection} | Action: ${p.action}`);
      });
    } else {
      console.log('\n✅ No legacy permissions on role.');
    }
  } else {
    console.log('\n❌ Error fetching role permissions:', rolePermRes.status);
  }
}

debugPermissions();

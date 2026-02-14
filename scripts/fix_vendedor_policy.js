const DIRECTUS_URL = 'http://localhost:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

const ROLE_ID = '0448b826-6817-4106-8488-7237dfa55abf';
const NEW_POLICY_ID = '425cf8a4-8280-4d28-8be1-fdb0e8780238';

async function fixPolicy() {
  console.log('🔧 Fixing Vendedor Role Policy...');

  // 1. Login
  const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data.access_token;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 1.5 Check Admin User
  const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields=*,role.*`, { headers });
  const meData = await meRes.json();
  console.log('Logged in as:', meData.data.email);
  if (meData.data.role) {
    console.log('Admin Role:', meData.data.role.name, meData.data.role.id);
    console.log('Admin Access:', meData.data.role.admin_access);
  } else {
    console.log('Admin Role: NULL (Super Admin?)');
  }

  // 2. Check Role
  const roleRes = await fetch(`${DIRECTUS_URL}/roles/${ROLE_ID}`, { headers });
  const roleData = await roleRes.json();
  console.log('Current Policies:', roleData.data.policies);

  // 3. Update Role to use ONLY the new policy
  const updateRes = await fetch(`${DIRECTUS_URL}/roles/${ROLE_ID}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      policies: [NEW_POLICY_ID],
    }),
  });

  if (updateRes.ok) {
    const updateData = await updateRes.json();
    console.log('✅ Role updated. New Policies:', updateData.data.policies);
  } else {
    console.error('❌ Failed to update role:', updateRes.status, await updateRes.text());
  }
}

fixPolicy();

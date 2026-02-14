const DIRECTUS_URL = 'http://localhost:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

const POLICY_ID = '425cf8a4-8280-4d28-8be1-fdb0e8780238';

async function restore() {
  console.log('🚑 Restoring Vendedor Role (Basic)...');

  // 1. Login
  const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const token = (await loginRes.json()).data.access_token;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 2. Create Role (No policies yet)
  const createRes = await fetch(`${DIRECTUS_URL}/roles`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Vendedor',
      icon: 'badge',
      description: 'Perfil de ventas.',
      app_access: true,
      admin_access: false,
    }),
  });

  if (!createRes.ok) {
    console.error('❌ Failed to create role:', await createRes.text());
    return;
  }
  const roleData = await createRes.json();
  const roleId = roleData.data.id;
  console.log(`✅ Role Created: ${roleId}`);

  // 3. Find User and Assign
  // We know the user ID: 3880dee8-fb81-48aa-858c-4e6c9a269588
  const uid = '3880dee8-fb81-48aa-858c-4e6c9a269588';
  await fetch(`${DIRECTUS_URL}/users/${uid}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ role: roleId }),
  });
  console.log('✅ User re-assigned.');

  // 4. Try to attach Policy again (checking error details)
  console.log('🤞 Attempting to attach Policy...');
  const patchRes = await fetch(`${DIRECTUS_URL}/roles/${roleId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      policies: [POLICY_ID],
    }),
  });
  if (patchRes.ok) {
    console.log('✅ Policy attached successfully!');
  } else {
    console.error('❌ Failed to attach policy:', await patchRes.text());
  }
}

restore();

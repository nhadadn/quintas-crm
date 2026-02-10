const DIRECTUS_URL = 'http://localhost:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

const OLD_ROLE_ID = '0448b826-6817-4106-8488-7237dfa55abf';
const POLICY_ID = '425cf8a4-8280-4d28-8be1-fdb0e8780238'; // The correct policy with permissions

async function recreateRole() {
  console.log('🔄 Recreating Vendedor Role...');

  // 1. Login
  const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  const token = (await loginRes.json()).data.access_token;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 2. Find Users with Old Role
  const usersRes = await fetch(`${DIRECTUS_URL}/users?filter[role][_eq]=${OLD_ROLE_ID}`, { headers });
  const usersData = await usersRes.json();
  const userIds = usersData.data.map(u => u.id);
  console.log(`Found ${userIds.length} users to migrate.`);

  // 3. Detach users from role (Update to null)
  for (const uid of userIds) {
      await fetch(`${DIRECTUS_URL}/users/${uid}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ role: null })
      });
      console.log(`User ${uid} detached.`);
  }

  // 4. Delete Old Role
  const delRes = await fetch(`${DIRECTUS_URL}/roles/${OLD_ROLE_ID}`, {
      method: 'DELETE',
      headers
  });
  if (delRes.ok) console.log('✅ Old Role deleted.');
  else console.error('❌ Failed to delete old role:', delRes.status);

  // 5. Create New Role with Policy
  const createRes = await fetch(`${DIRECTUS_URL}/roles`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
          name: 'Vendedor',
          icon: 'badge',
          description: 'Perfil de ventas con acceso limitado a sus propios registros.',
          app_access: true,
          admin_access: false,
          policies: [POLICY_ID] // Attach policy at creation
      })
  });

  if (!createRes.ok) {
      console.error('❌ Failed to create new role:', await createRes.text());
      return;
  }

  const createData = await createRes.json();
  const newRoleId = createData.data.id;
  console.log(`✅ New Role created (ID: ${newRoleId}) with Policy attached.`);

  // 6. Re-assign users
  for (const uid of userIds) {
      await fetch(`${DIRECTUS_URL}/users/${uid}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ role: newRoleId })
      });
      console.log(`User ${uid} migrated to new role.`);
  }

  console.log('🎉 Done!');
}

recreateRole();

const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

const TEST_USER = {
  email: 'test_vendedor_qa@quintas.com',
  password: 'Password123!',
  first_name: 'Test',
  last_name: 'Vendedor',
};

async function verifyPermissions() {
  console.log('🕵️ Verifying Vendedor Role Permissions...');

  // 1. Admin Login
  let adminToken;
  try {
    const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });

    if (!res.ok) {
      console.error('❌ Admin login failed');
      const err = await res.json();
      console.error('Error:', JSON.stringify(err));
      process.exit(1);
    }

    const data = await res.json();
    adminToken = data.data.access_token;
  } catch (e) {
    console.error('❌ Admin login failed:', e);
    process.exit(1);
  }

  // 2. Get Vendedor Role
  let roleId;
  const rolesRes = await fetch(`${DIRECTUS_URL}/roles?filter[name][_eq]=Vendedor`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const rolesData = await rolesRes.json();
  if (!rolesData.data.length) {
    console.error('❌ Role Vendedor not found');
    process.exit(1);
  }
  roleId = rolesData.data[0].id;

  // Clear Cache
  console.log('🧹 Clearing Directus Cache...');
  await fetch(`${DIRECTUS_URL}/utils/cache/clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  // 3. Create Test User
  console.log('👤 Creating temporary test user...');
  let userId;
  try {
    const createRes = await fetch(`${DIRECTUS_URL}/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...TEST_USER,
        role: roleId,
        status: 'active',
      }),
    });
    const createData = await createRes.json();
    if (createData.errors) {
      // If exists, find it
      const findRes = await fetch(`${DIRECTUS_URL}/users?filter[email][_eq]=${TEST_USER.email}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const findData = await findRes.json();
      if (findData.data.length > 0) {
        userId = findData.data[0].id;
        // Update password just in case
        await fetch(`${DIRECTUS_URL}/users/${userId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: TEST_USER.password }),
        });
        console.log('   User existed, password updated.');
      } else {
        throw new Error(JSON.stringify(createData.errors));
      }
    } else {
      userId = createData.data.id;
    }
  } catch (e) {
    console.error('❌ Failed to create/update test user:', e);
    process.exit(1);
  }

  // 4. Login as Test User
  console.log('🔑 Logging in as test user...');
  let userToken;
  try {
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
    });
    const loginData = await loginRes.json();
    if (!loginData.data) throw new Error(JSON.stringify(loginData));
    userToken = loginData.data.access_token;
    console.log('✅ Login successful!');
  } catch (e) {
    console.error('❌ Test user login failed:', e);
    // Cleanup
    await fetch(`${DIRECTUS_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    process.exit(1);
  }

  const userHeaders = {
    Authorization: `Bearer ${userToken}`,
    'Content-Type': 'application/json',
  };

  // 5. Verify Permissions
  console.log('\n🛡️ Checking Permissions:');

  // A. Read Lotes (Should succeed)
  const lotesRes = await fetch(`${DIRECTUS_URL}/items/lotes?limit=1`, { headers: userHeaders });
  console.log(`   [Lotes: Read] ${lotesRes.ok ? '✅ Allowed' : '❌ Denied'} (${lotesRes.status})`);

  // B. Read Ventas (Should see none or only own)
  const ventasRes = await fetch(`${DIRECTUS_URL}/items/ventas`, { headers: userHeaders });
  const ventasData = await ventasRes.json();
  console.log(
    `   [Ventas: Read] ${ventasRes.ok ? '✅ Allowed' : '❌ Denied'} - Found: ${ventasData.data ? ventasData.data.length : 0}`
  );

  // C. Create Venta (Should succeed)
  // We need a valid lote_id and cliente_id. Since we might not have them easily, we'll try to create a dummy one if possible,
  // or just check if we get a validation error (400) instead of permission error (403).
  // But wait, to create a venta we need a lote.

  // Clientes: Create
  console.log('   [Clientes: Create] Attempting to create a client...');
  const newClient = {
    nombre: 'Test Client',
    apellido_paterno: 'CreatedByVendedor',
    email: 'testclient@example.com',
  };
  const createClienteRes = await fetch(`${DIRECTUS_URL}/items/clientes`, {
    method: 'POST',
    headers: userHeaders,
    body: JSON.stringify(newClient),
  });

  if (createClienteRes.ok) {
    const createData = await createClienteRes.json();
    console.log(`   [Clientes: Create] ✅ Allowed - ID: ${createData.data.id}`);
  } else {
    console.log(`   [Clientes: Create] ❌ Denied - Status: ${createClienteRes.status}`);
    const err = await createClienteRes.json();
    console.log('   Error Body:', JSON.stringify(err));
  }

  // Read Clientes (Should see none or only own)
  const clientesRes = await fetch(`${DIRECTUS_URL}/items/clientes`, { headers: userHeaders });
  const clientesData = await clientesRes.json();
  if (!clientesRes.ok) console.log('   Error Body:', JSON.stringify(clientesData));
  console.log(
    `   [Clientes: Read] ${clientesRes.ok ? '✅ Allowed' : '❌ Denied'} - Found: ${clientesData.data ? clientesData.data.length : 0}`
  );

  // E. Read Users (Should see self)
  const usersRes = await fetch(`${DIRECTUS_URL}/users/${userId}`, { headers: userHeaders });
  console.log(
    `   [Users: Read Self] ${usersRes.ok ? '✅ Allowed' : '❌ Denied'} (${usersRes.status})`
  );

  const otherUserRes = await fetch(`${DIRECTUS_URL}/users?limit=1&filter[id][_neq]=${userId}`, {
    headers: userHeaders,
  });
  const otherUserData = await otherUserRes.json();
  // Depending on configuration, reading list might be empty or forbidden.
  // Our rule was: read mine. So list might return empty or forbidden if filter not applied?
  // Actually "read mine" usually implies filter `id == $CURRENT_USER`.
  // If we query list without filter, Directus should return only our user or empty.
  console.log(
    `   [Users: Read All] Found: ${otherUserData.data ? otherUserData.data.length : 0} (Should be 0 or contain only self)`
  );

  // 6. Cleanup
  console.log('\n🧹 Cleaning up test user...');
  await fetch(`${DIRECTUS_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('✅ Test user deleted.');
}

verifyPermissions();

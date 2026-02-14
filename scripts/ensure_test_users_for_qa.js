const fetch = require('node-fetch');

const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

const COMMON_PASSWORD = 'Password123!';

async function ensureUsers() {
  console.log('🚀 Setting up QA Test Users...');

  // 1. Login as Admin
  let token;
  try {
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
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
    'Content-Type': 'application/json',
  };

  // 2. Get Roles
  let vendedorRoleId, clienteRoleId;
  try {
    const rolesRes = await fetch(`${DIRECTUS_URL}/roles`, { headers });
    const rolesData = await rolesRes.json();

    vendedorRoleId = rolesData.data.find((r) => r.name === 'Vendedor')?.id;
    clienteRoleId = rolesData.data.find((r) => r.name === 'Cliente')?.id;

    if (!vendedorRoleId) console.error('⚠️ Role "Vendedor" not found!');
    if (!clienteRoleId) console.error('⚠️ Role "Cliente" not found!');
  } catch (e) {
    console.error('❌ Error fetching roles:', e.message);
  }

  // 3. Ensure Vendedor User
  const vendedorEmail = 'vendedor.qa@quintas.com';
  await ensureUser(headers, vendedorEmail, 'Vendedor', 'QA', vendedorRoleId, COMMON_PASSWORD);

  // 4. Ensure Cliente User
  const clienteEmail = 'cliente.qa@quintas.com';
  await ensureUser(headers, clienteEmail, 'Cliente', 'QA', clienteRoleId, COMMON_PASSWORD);

  // 5. Ensure "cliente.prueba" matches too (legacy)
  await ensureUser(
    headers,
    'cliente.prueba@quintas.com',
    'Cliente',
    'Prueba',
    clienteRoleId,
    COMMON_PASSWORD
  );

  console.log('\n🎉 QA Users Setup Complete!');
  console.log('------------------------------------------------');
  console.log(`Admin:    ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`Vendedor: ${vendedorEmail} / ${COMMON_PASSWORD}`);
  console.log(`Cliente:  ${clienteEmail} / ${COMMON_PASSWORD}`);
  console.log('------------------------------------------------');
}

async function ensureUser(headers, email, firstName, lastName, roleId, password) {
  if (!roleId) {
    console.log(`Skipping ${email} due to missing role.`);
    return;
  }

  try {
    // Check if exists
    const searchRes = await fetch(`${DIRECTUS_URL}/users?filter[email][_eq]=${email}`, { headers });
    const searchData = await searchRes.json();

    if (searchData.data.length > 0) {
      const userId = searchData.data[0].id;
      // Update password
      await fetch(`${DIRECTUS_URL}/users/${userId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ password: password, role: roleId, status: 'active' }),
      });
      console.log(`✅ Updated existing user: ${email}`);
    } else {
      // Create
      await fetch(`${DIRECTUS_URL}/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          role: roleId,
          status: 'active',
          provider: 'default',
        }),
      });
      console.log(`✅ Created new user: ${email}`);
    }
  } catch (e) {
    console.error(`❌ Error managing user ${email}:`, e.message);
  }
}

ensureUsers();

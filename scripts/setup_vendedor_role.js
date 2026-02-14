const DIRECTUS_URL = 'http://localhost:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function setup() {
  console.log('🚀 Starting Vendedor Role Setup...');

  // 1. Login
  let token;
  try {
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
    const loginData = await loginRes.json();
    token = loginData.data.access_token;
    console.log('✅ Login successful');
  } catch (e) {
    console.error('❌ Login error:', e.message);
    process.exit(1);
  }

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 2. Get or Create "Vendedor" Role
  let roleId;
  try {
    const rolesRes = await fetch(`${DIRECTUS_URL}/roles?filter[name][_eq]=Vendedor`, {
      headers: authHeaders,
    });
    const rolesData = await rolesRes.json();

    if (rolesData.data.length > 0) {
      roleId = rolesData.data[0].id;
      console.log(`ℹ️ Role "Vendedor" exists (ID: ${roleId})`);
    } else {
      console.log('creating role Vendedor...');
      const createRes = await fetch(`${DIRECTUS_URL}/roles`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Vendedor',
          icon: 'badge',
          description: 'Perfil de ventas con acceso limitado a sus propios registros.',
          app_access: true, // Allow app access
          admin_access: false,
        }),
      });
      const createData = await createRes.json();
      roleId = createData.data.id;
      console.log(`✅ Role "Vendedor" created (ID: ${roleId})`);
    }
  } catch (e) {
    console.error('❌ Error managing role:', e.message);
    process.exit(1);
  }

  // 3. Define Permissions
  const permissions = [
    // Lotes: Read All
    { collection: 'lotes', action: 'read', fields: '*', permissions: {} },

    // Ventas: Create, Read (Mine)
    { collection: 'ventas', action: 'create', fields: '*' },
    {
      collection: 'ventas',
      action: 'read',
      fields: '*',
      permissions: { vendedor_id: { _eq: '$CURRENT_USER' } },
    },

    // Clientes: Create, Read (Mine), Update (Mine)
    // Assuming user_created tracks creator. If not, this rule might need adjustment.
    { collection: 'clientes', action: 'create', fields: '*' },
    {
      collection: 'clientes',
      action: 'read',
      fields: '*',
      permissions: {
        _or: [{ user_created: { _eq: '$CURRENT_USER' } }, { user_id: { _eq: '$CURRENT_USER' } }],
      },
    }, // Try both
    {
      collection: 'clientes',
      action: 'update',
      fields: '*',
      permissions: {
        _or: [{ user_created: { _eq: '$CURRENT_USER' } }, { user_id: { _eq: '$CURRENT_USER' } }],
      },
    },

    // Pagos: Read (Mine via Venta)
    {
      collection: 'pagos',
      action: 'read',
      fields: '*',
      permissions: { venta_id: { vendedor_id: { _eq: '$CURRENT_USER' } } },
    },

    // Comisiones: Read (Mine)
    {
      collection: 'comisiones',
      action: 'read',
      fields: '*',
      permissions: { vendedor_id: { _eq: '$CURRENT_USER' } },
    },

    // Usuarios: Read/Update (Self)
    {
      collection: 'directus_users',
      action: 'read',
      fields: '*',
      permissions: { id: { _eq: '$CURRENT_USER' } },
    },
    {
      collection: 'directus_users',
      action: 'update',
      fields: '*',
      permissions: { id: { _eq: '$CURRENT_USER' } },
    },
  ];

  // 4. Clear Existing Permissions for Role (Legacy Check)
  // Skipped because we are using Policies now

  // 5. Create New Permissions
  try {
    console.log('✨ Creating new permissions...');
    // Directus requires "policy" field in newer versions instead of just "role" for permissions,
    // BUT for custom roles, we attach permissions directly to role in /permissions endpoint (legacy style) OR via Policies.
    // In Directus 10.10+ permissions are linked to Policies, and Roles have Policies.
    // Let's check if we are on a version that uses Policies.
    // If the error was "Validation failed for field 'policy'. Value is required.", it means we need a policy.

    // STRATEGY:
    // 1. Create a Policy named "Vendedor Policy"
    // 2. Assign permissions to that Policy
    // 3. Assign that Policy to the "Vendedor" Role

    let policyId;

    // Check if policy exists
    const policiesRes = await fetch(`${DIRECTUS_URL}/policies?filter[name][_eq]=Vendedor Policy`, {
      headers: authHeaders,
    });
    const policiesData = await policiesRes.json();

    if (policiesData.data && policiesData.data.length > 0) {
      policyId = policiesData.data[0].id;
      console.log(`ℹ️ Policy "Vendedor Policy" exists (ID: ${policyId})`);
    } else {
      console.log('creating policy Vendedor Policy...');
      const createPolicyRes = await fetch(`${DIRECTUS_URL}/policies`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Vendedor Policy',
          icon: 'badge',
          description: 'Policy for Vendedor role permissions',
          enforce_tfa: false,
          admin_access: false,
          app_access: true,
        }),
      });
      const createPolicyData = await createPolicyRes.json();
      policyId = createPolicyData.data.id;
      console.log(`✅ Policy "Vendedor Policy" created (ID: ${policyId})`);
    }

    // Assign Policy to Role (if not already assigned)
    // In Directus, roles have a `policies` field which is an array of policy IDs (or junction objects).
    // Let's update the role to include this policy.
    // Note: This might be many-to-many. Let's try updating the role with the policy ID.
    // Actually, usually it's `policies` array in Role object.

    // Re-fetch role to check current policies
    const roleRes = await fetch(`${DIRECTUS_URL}/roles/${roleId}`, { headers: authHeaders });
    const roleData = await roleRes.json();
    const currentPolicies = roleData.data.policies || [];

    if (!currentPolicies.includes(policyId)) {
      console.log('Linking Policy to Role...');
      await fetch(`${DIRECTUS_URL}/roles/${roleId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          policies: [...currentPolicies, policyId],
        }),
      });
    }

    // Now create permissions linked to POLICY, not ROLE
    // The previous error was because we sent `role: roleId` but it expected `policy`.

    // First clear existing permissions for this POLICY
    const permRes = await fetch(
      `${DIRECTUS_URL}/permissions?filter[policy][_eq]=${policyId}&limit=-1`,
      { headers: authHeaders }
    );
    const permData = await permRes.json();
    const existingIds = permData.data.map((p) => p.id);
    if (existingIds.length > 0) {
      console.log(`🗑️ Deleting ${existingIds.length} existing permissions from Policy...`);
      await fetch(`${DIRECTUS_URL}/permissions`, {
        method: 'DELETE',
        headers: authHeaders,
        body: JSON.stringify(existingIds),
      });
    }

    const payload = permissions.map((p) => ({ ...p, policy: policyId }));

    const createRes = await fetch(`${DIRECTUS_URL}/permissions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      console.error('❌ Failed to create permissions:', JSON.stringify(err, null, 2));
    } else {
      console.log('✅ Permissions configured successfully!');
    }
  } catch (e) {
    console.error('❌ Error creating permissions:', e.message);
  }
}

setup();

const mysql = require('mysql2/promise');
const crypto = require('crypto');

const DB_CONFIG = {
  host: '127.0.0.1',
  user: 'root',
  password: 'narizon1',
  database: 'quintas_otinapaV2',
  port: 3306,
};

async function fixPermissions() {
  console.log('🔧 Connecting to MySQL...');
  const connection = await mysql.createConnection(DB_CONFIG);
  console.log('✅ Connected.');

  try {
    // --- 1. FIX ADMINISTRATOR ---
    console.log('\n--- Fixing Administrator ---');
    // Find Administrator Role
    const [adminRoles] = await connection.execute(
      'SELECT id FROM directus_roles WHERE name = "Administrator"'
    );
    let adminRoleId;
    if (adminRoles.length > 0) {
      adminRoleId = adminRoles[0].id;
      console.log(`Found Administrator Role ID: ${adminRoleId}`);
    } else {
      console.error('❌ Administrator role not found!');
      // Should we create it? Assuming it exists for now.
    }

    // Find Administrator Policy (admin_access = 1)
    const [adminPolicies] = await connection.execute(
      'SELECT id, name FROM directus_policies WHERE admin_access = 1'
    );
    let adminPolicyId;
    if (adminPolicies.length > 0) {
      adminPolicyId = adminPolicies[0].id;
      console.log(`Found Admin Policy: ${adminPolicies[0].name} (${adminPolicyId})`);
    } else {
      console.log(
        '⚠️ No policy with admin_access=1 found. Checking for "Administrator" policy name...'
      );
      const [namedPolicies] = await connection.execute(
        'SELECT id FROM directus_policies WHERE name = "Administrator"'
      );
      if (namedPolicies.length > 0) {
        adminPolicyId = namedPolicies[0].id;
        console.log(
          `Found Policy by name "Administrator": ${adminPolicyId}. Updating admin_access...`
        );
        await connection.execute(
          'UPDATE directus_policies SET admin_access = 1, app_access = 1 WHERE id = ?',
          [adminPolicyId]
        );
      } else {
        console.error('❌ No Administrator policy found at all!');
      }
    }

    // Link Admin Role <-> Admin Policy
    if (adminRoleId && adminPolicyId) {
      const [existing] = await connection.execute(
        'SELECT id FROM directus_access WHERE role = ? AND policy = ?',
        [adminRoleId, adminPolicyId]
      );
      if (existing.length === 0) {
        const newId = crypto.randomUUID();
        await connection.execute(
          'INSERT INTO directus_access (id, role, policy) VALUES (?, ?, ?)',
          [newId, adminRoleId, adminPolicyId]
        );
        console.log('✅ Linked Administrator Role to Admin Policy.');
      } else {
        console.log('✅ Administrator Role already linked to Policy.');
      }
    }

    // --- 2. FIX VENDEDOR ---
    console.log('\n--- Fixing Vendedor ---');
    const VENDEDOR_ROLE_ID = 'fcacda12-f932-4ac6-ac39-183653e9c5fe';
    const VENDEDOR_POLICY_ID = '425cf8a4-8280-4d28-8be1-fdb0e8780238';

    // Verify Role Exists
    const [vRoles] = await connection.execute('SELECT id FROM directus_roles WHERE id = ?', [
      VENDEDOR_ROLE_ID,
    ]);
    if (vRoles.length === 0) {
      console.log('⚠️ Vendedor Role ID not found in DB. Creating it...');
      await connection.execute(
        'INSERT INTO directus_roles (id, name, icon, description) VALUES (?, ?, ?, ?)',
        [VENDEDOR_ROLE_ID, 'Vendedor', 'storefront', 'Perfil para vendedores']
      );
      console.log('✅ Created Vendedor Role.');
    }

    // Verify Policy Exists
    const [vPolicies] = await connection.execute('SELECT id FROM directus_policies WHERE id = ?', [
      VENDEDOR_POLICY_ID,
    ]);
    if (vPolicies.length === 0) {
      console.log('⚠️ Vendedor Policy ID not found in DB. Creating it...');
      // Create basic app access policy
      await connection.execute(
        'INSERT INTO directus_policies (id, name, app_access, admin_access) VALUES (?, ?, ?, ?)',
        [VENDEDOR_POLICY_ID, 'Vendedor Policy', 1, 0]
      );
      console.log('✅ Created Vendedor Policy.');
    } else {
      // Ensure app_access is 1
      await connection.execute('UPDATE directus_policies SET app_access = 1 WHERE id = ?', [
        VENDEDOR_POLICY_ID,
      ]);
      console.log('✅ Ensured Vendedor Policy has app_access=1.');
    }

    // Link Vendedor Role <-> Vendedor Policy
    const [vAccess] = await connection.execute(
      'SELECT id FROM directus_access WHERE role = ? AND policy = ?',
      [VENDEDOR_ROLE_ID, VENDEDOR_POLICY_ID]
    );
    if (vAccess.length === 0) {
      const newId = crypto.randomUUID();
      await connection.execute('INSERT INTO directus_access (id, role, policy) VALUES (?, ?, ?)', [
        newId,
        VENDEDOR_ROLE_ID,
        VENDEDOR_POLICY_ID,
      ]);
      console.log('✅ Linked Vendedor Role to Vendedor Policy.');
    } else {
      console.log('✅ Vendedor Role already linked to Policy.');
    }

    // --- 3. FIX VENDEDOR USER ---
    console.log('\n--- Fixing Vendedor User ---');
    // Ensure the user Erick Navarrete has the Vendedor Role
    const USER_EMAIL = 'erick.navarrete@gmail.com';
    const [users] = await connection.execute(
      'SELECT id, role FROM directus_users WHERE email = ?',
      [USER_EMAIL]
    );
    if (users.length > 0) {
      const user = users[0];
      if (user.role !== VENDEDOR_ROLE_ID) {
        console.log(`Updating user ${USER_EMAIL} role from ${user.role} to ${VENDEDOR_ROLE_ID}`);
        await connection.execute('UPDATE directus_users SET role = ? WHERE id = ?', [
          VENDEDOR_ROLE_ID,
          user.id,
        ]);
        console.log('✅ User role updated.');
      } else {
        console.log('✅ User already has correct role.');
      }
    } else {
      console.log(`⚠️ User ${USER_EMAIL} not found.`);
    }
  } catch (err) {
    console.error('❌ SQL Error:', err);
  } finally {
    await connection.end();
  }
}

fixPermissions();

const mysql = require('mysql2/promise');
const crypto = require('crypto');

const DB_CONFIG = {
  host: '127.0.0.1',
  user: 'root',
  password: 'narizon1',
  database: 'quintas_otinapaV2',
  port: 3306,
};

async function fixAdmin() {
  console.log('🔧 Connecting to MySQL...');
  const connection = await mysql.createConnection(DB_CONFIG);
  console.log('✅ Connected.');

  try {
    // 1. Find Admin User and Role
    const [users] = await connection.execute(
      'SELECT id, email, role FROM directus_users WHERE email = ?',
      ['admin@quintas.com']
    );

    if (users.length === 0) {
      console.error('❌ Admin user not found in DB!');
      return;
    }

    const adminUser = users[0];
    console.log('👤 Admin User found:', adminUser.email, 'Role:', adminUser.role);

    if (!adminUser.role) {
      console.log('⚠️ Admin user has NO role. This implies Super Admin (null role).');
    } else {
      // 2. Check Role
      const [roles] = await connection.execute(
        'SELECT id, name, admin_access FROM directus_roles WHERE id = ?',
        [adminUser.role]
      );

      if (roles.length > 0) {
        const role = roles[0];
        console.log('🛡️ Role details:', role);

        if (role.admin_access !== 1) {
          console.log('⚠️ admin_access is FALSE/NULL. Fixing it...');
          await connection.execute(
            'UPDATE directus_roles SET admin_access = 1, app_access = 1 WHERE id = ?',
            [adminUser.role]
          );
          console.log('✅ Role updated: admin_access = 1');
        } else {
          console.log('✅ Role already has admin_access = 1.');
        }
      }
    }

    // 3. Also fix "Administrator" role by name just in case
    const [adminRoles] = await connection.execute(
      'SELECT id, name FROM directus_roles WHERE name = "Administrator"'
    );
    if (adminRoles.length > 0) {
      for (const r of adminRoles) {
        console.log(`Checking named Administrator role: ${r.id}`);
        await connection.execute('UPDATE directus_roles SET admin_access = 1 WHERE id = ?', [r.id]);
      }
    }

    // 4. Force Vendedor Role to have Policy attached (Manual SQL Linkage)
    const VENDEDOR_ROLE_ID = 'fcacda12-f932-4ac6-ac39-183653e9c5fe';
    const POLICY_ID = '425cf8a4-8280-4d28-8be1-fdb0e8780238';

    const [tables] = await connection.execute('SHOW TABLES LIKE "directus_access"');
    if (tables.length > 0) {
      console.log('found directus_access table. Using it.');
      const [existing] = await connection.execute(
        'SELECT id FROM directus_access WHERE role = ? AND policy = ?',
        [VENDEDOR_ROLE_ID, POLICY_ID]
      );
      if (existing.length === 0) {
        // MySQL UUID() function works, but safer to pass it if needed.
        // Directus uses UUIDv4.
        const newId = crypto.randomUUID();
        await connection.execute(
          'INSERT INTO directus_access (id, role, policy) VALUES (?, ?, ?)',
          [newId, VENDEDOR_ROLE_ID, POLICY_ID]
        );
        console.log('✅ Inserted into directus_access');
      } else {
        console.log('✅ Linkage already exists in directus_access');
      }
    } else {
      console.log('directus_access table NOT found. Checking directus_roles structure...');
      const [cols] = await connection.execute('SHOW COLUMNS FROM directus_roles LIKE "policies"');
      if (cols.length > 0) {
        console.log('Found policies column in directus_roles. Updating JSON...');
        await connection.execute('UPDATE directus_roles SET policies = ? WHERE id = ?', [
          JSON.stringify([POLICY_ID]),
          VENDEDOR_ROLE_ID,
        ]);
        console.log('✅ Updated directus_roles.policies');
      }
    }
  } catch (err) {
    console.error('❌ SQL Error:', err);
  } finally {
    await connection.end();
  }
}

fixAdmin();

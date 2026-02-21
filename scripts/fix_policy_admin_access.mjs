import mysql from 'mysql2/promise';
import 'dotenv/config';

const USER_ID = process.env.ADMIN_USER_ID || 'e549592c-2498-4bba-93a7-b7f30903948c';

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
    port: Number(process.env.DB_PORT || 3306),
    multipleStatements: true,
  });
  try {
    const [usrRows] = await conn.query('SELECT id, role FROM directus_users WHERE id = ?', [USER_ID]);
    const roleId = usrRows?.[0]?.role;
    if (!roleId) throw new Error('No se encontró el rol del usuario admin');

    // Crear Policy admin_access=1 si no existe
    let policyId = null;
    const [polRows] = await conn.query('SELECT id FROM directus_policies WHERE admin_access = 1 LIMIT 1');
    if (Array.isArray(polRows) && polRows.length > 0) {
      policyId = polRows[0].id;
    } else {
      policyId = cryptoRandomUUID();
      await conn.query(
        'INSERT INTO directus_policies (id, name, icon, description, ip_access, enforce_tfa, admin_access, app_access) VALUES (?, ?, ?, ?, NULL, 0, 1, 1)',
        [policyId, 'Administrator', 'verified', 'Full system access']
      );
    }

    // Mapear acceso Role<->Policy en directus_access si no existe
    const [accessRows] = await conn.query('SELECT id FROM directus_access WHERE role = ? AND policy = ? LIMIT 1', [roleId, policyId]);
    if (!Array.isArray(accessRows) || accessRows.length === 0) {
      await conn.query('INSERT INTO directus_access (id, role, user, policy, sort) VALUES (?, ?, NULL, ?, 1)', [cryptoRandomUUID(), roleId, policyId]);
    }

    console.log('✅ Policy admin_access enlazada al rol actual');
  } catch (e) {
    console.error('❌ Error corrigiendo policy admin_access:', e);
  } finally {
    await conn.end();
  }
}

function cryptoRandomUUID() {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return (
    s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
  );
}

main();


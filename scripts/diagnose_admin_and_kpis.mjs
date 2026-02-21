import mysql from 'mysql2/promise';
import 'dotenv/config';

const USER_ID = 'e549592c-2498-4bba-93a7-b7f30903948c';

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
    console.log('=== Verificando vista v_dashboard_kpis ===');
    const [exists] = await conn.query(
      "SHOW FULL TABLES WHERE Table_type='VIEW' AND Tables_in_" +
        conn.config.database +
        " = 'v_dashboard_kpis'"
    );
    console.log('Existe vista:', Array.isArray(exists) && exists.length > 0);
    try {
      const [createView] = await conn.query('SHOW CREATE VIEW v_dashboard_kpis');
      console.log('SHOW CREATE VIEW:', createView?.[0]?.['Create View'] ? 'OK' : 'N/A');
    } catch (e) {
      console.warn('SHOW CREATE VIEW falló:', e.message);
    }

    console.log('\n=== Verificando registro en Directus ===');
    const [coll] = await conn.query(
      "SELECT * FROM directus_collections WHERE collection='v_dashboard_kpis'"
    );
    console.log('directus_collections:', coll);
    const [fields] = await conn.query(
      "SELECT collection, field, special FROM directus_fields WHERE collection='v_dashboard_kpis'"
    );
    console.log('directus_fields count:', Array.isArray(fields) ? fields.length : 0);

    console.log('\n=== Usuario y rol ===');
    const [usr] = await conn.query('SELECT id, email, role FROM directus_users WHERE id = ?', [
      USER_ID,
    ]);
    console.log('directus_users entry:', usr?.[0] || null);
    const roleId = usr?.[0]?.role || null;
    if (roleId) {
      const [r] = await conn.query(
        'SELECT id, name, admin_access, app_access FROM directus_roles WHERE id = ?',
        [roleId]
      );
      console.log('directus_roles for user:', r?.[0] || null);
    }

    console.log('\n=== Policies y permisos para el rol del usuario ===');
    if (roleId) {
      const [access] = await conn.query(
        'SELECT policy FROM directus_access WHERE role = ?',
        [roleId]
      );
      console.log('directus_access mappings:', access);
      const policyIds = access.map((a) => a.policy).filter(Boolean);
      if (policyIds.length) {
        const [perms] = await conn.query(
          `SELECT policy, collection, action, fields, permissions
           FROM directus_permissions
           WHERE policy IN (${policyIds.map(() => '?').join(',')})
           ORDER BY policy, collection, action`,
          policyIds
        );
        console.log('Permisos vinculados:', perms);
        const [pols] = await conn.query(
          `SELECT id, name, effect, description FROM directus_policies WHERE id IN (${policyIds
            .map(() => '?')
            .join(',')})`,
          policyIds
        );
        console.log('Policies vinculadas:', pols);
      }
    }
  } catch (e) {
    console.error('❌ Error en diagnóstico:', e);
  } finally {
    await conn.end();
  }
}

main();

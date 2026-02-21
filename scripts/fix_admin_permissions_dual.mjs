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
    console.log('→ Detectando columnas de directus_roles...');
    let colInfo = {};
    try {
      const [rows] = await conn.query('SHOW COLUMNS FROM directus_roles');
      for (const r of rows) colInfo[r.Field] = true;
    } catch (e) {
      console.error('No se pudo describir directus_roles:', e.message);
    }
    const hasAdminAccess = !!colInfo['admin_access'];
    const hasAdmin = !!colInfo['admin'];
    if (!hasAdminAccess && !hasAdmin) {
      throw new Error('No existe columna admin_access ni admin en directus_roles; abortando por seguridad');
    }

    console.log('→ Buscando rol Administrator...');
    const [roleRows] = await conn.query(
      "SELECT id, name FROM directus_roles WHERE LOWER(name) = 'administrator' LIMIT 1"
    );
    let adminRoleId = roleRows?.[0]?.id || null;
    if (!adminRoleId) {
      console.log('→ Creando rol Administrator...');
      adminRoleId = cryptoRandomUUID();
      await conn.query(
        'INSERT INTO directus_roles (id, name, icon, description) VALUES (?, ?, ?, ?)',
        [adminRoleId, 'Administrator', 'verified', 'Full system access']
      );
    }
    console.log('→ Activando super admin flag en rol Administrator...');
    if (hasAdminAccess) {
      await conn.query('UPDATE directus_roles SET admin_access = 1 WHERE id = ?', [adminRoleId]);
    } else if (hasAdmin) {
      await conn.query('UPDATE directus_roles SET admin = 1 WHERE id = ?', [adminRoleId]);
    }

    console.log('→ Asignando rol Administrator al usuario objetivo...');
    await conn.query('UPDATE directus_users SET role = ? WHERE id = ?', [adminRoleId, USER_ID]);

    console.log('→ Re-creando vista v_dashboard_kpis...');
    await conn.query('DROP VIEW IF EXISTS v_dashboard_kpis');
    await conn.query(
      `CREATE VIEW v_dashboard_kpis AS
       SELECT
         v.id AS venta_id,
         v.fecha_venta,
         v.estatus,
         v.monto_total AS total_contratado,
         COALESCE(SUM(p.monto_pagado), 0) AS total_pagado,
         v.tenant_id
       FROM ventas v
       LEFT JOIN pagos p ON p.venta_id = v.id AND p.estatus = 'pagado'
       GROUP BY v.id, v.fecha_venta, v.estatus, v.monto_total, v.tenant_id`
    );

    console.log('→ Registrando colección v_dashboard_kpis en Directus...');
    try {
      await conn.query(
        `INSERT INTO directus_collections (collection, icon, note, hidden, singleton, accountability)
         VALUES ('v_dashboard_kpis', 'dashboard', 'Vista agregada para KPIs del Dashboard', 0, 0, 'all')`
      );
    } catch (e) {
      // Duplicado: ignorar
      if (!String(e.message || '').includes('Duplicate')) throw e;
    }

    console.log('✅ Reparación completada');
  } catch (e) {
    console.error('❌ Error:', e);
  } finally {
    await conn.end();
  }
}

function cryptoRandomUUID() {
  // Simple fallback using random bytes if crypto.randomUUID no está disponible en el runtime actual
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return (
    s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
  );
}

main();

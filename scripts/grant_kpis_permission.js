const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  });

  try {
    console.log('🔧 Granting READ on v_dashboard_kpis to Cliente/Vendedor policies...');

    const [rows] = await connection.query(
      `
      SELECT da.policy
      FROM directus_access da
      JOIN directus_roles r ON r.id = da.role
      WHERE r.name IN ('Cliente','Vendedor')
      `
    );

    const policies = rows.map((r) => r.policy);
    if (policies.length === 0) {
      console.warn('⚠️ No policies found for roles Cliente/Vendedor');
      return;
    }

    for (const policyId of policies) {
      const [exists] = await connection.query(
        `SELECT 1 FROM directus_permissions WHERE policy=? AND collection='v_dashboard_kpis' AND action='read' LIMIT 1`,
        [policyId]
      );
      if (exists.length > 0) {
        console.log(`✓ Policy ${policyId}: permission already exists`);
        continue;
      }
      await connection.query(
        `INSERT INTO directus_permissions (policy, collection, action, permissions, validation, fields) VALUES (?, 'v_dashboard_kpis', 'read', '{}', '{}', '*')`,
        [policyId]
      );
      console.log(`✅ Policy ${policyId}: READ granted on v_dashboard_kpis`);
    }
  } catch (e) {
    console.error('❌ Error granting permissions:', e);
  } finally {
    await connection.end();
  }
}

main();

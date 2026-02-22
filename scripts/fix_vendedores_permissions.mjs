import mysql from 'mysql2/promise';
import 'dotenv/config';

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
    const [policyRows] = await conn.query(
      "SELECT id FROM directus_policies WHERE name = 'Vendedores' LIMIT 1",
    );
    if (!Array.isArray(policyRows) || policyRows.length === 0) {
      console.error('❌ No se encontró la policy "Vendedores"');
      process.exitCode = 1;
      return;
    }
    const policyId = policyRows[0].id;
    const collections = [
      'v_dashboard_kpis',
      'v_ventas_por_vendedor',
      'v_estado_pagos',
      'v_lotes_disponibles',
    ];
    let inserted = 0;
    let skipped = 0;
    for (const collection of collections) {
      const [exists] = await conn.query(
        "SELECT id FROM directus_permissions WHERE collection = ? AND action = 'read' AND policy = ? LIMIT 1",
        [collection, policyId],
      );
      if (Array.isArray(exists) && exists.length > 0) {
        console.log(`ℹ️ Permiso ya existe para ${collection}`);
        skipped++;
        continue;
      }
      const [res] = await conn.query(
        "INSERT INTO directus_permissions (collection, action, permissions, validation, fields, policy) VALUES (?, 'read', ?, NULL, '*', ?)",
        [collection, '{}', policyId],
      );
      inserted += res?.affectedRows ? 1 : 0;
      console.log(`✅ Permiso READ creado para ${collection}`);
    }
    console.log(`✅ Proceso completado. Insertados: ${inserted}, Omitidos: ${skipped}`);
  } catch (e) {
    console.error('❌ Error asignando permisos a Vendedores:', e);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();


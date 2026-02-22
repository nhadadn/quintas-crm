import mysql from 'mysql2/promise';
import 'dotenv/config';

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
    port: Number(process.env.DB_PORT || 3306),
  });
  try {
    // Visibilidad de la colección
    const [collRows] = await conn.query(
      "SELECT collection, hidden FROM directus_collections WHERE collection = 'pagos_movimientos' LIMIT 1",
    );
    if (Array.isArray(collRows) && collRows.length > 0) {
      const hidden = Number(collRows[0]?.hidden) === 1;
      console.log(`ℹ️ Colección encontrada. hidden=${hidden}`);
      if (!hidden) {
        console.log('✅ La colección pagos_movimientos NO está oculta');
      } else {
        console.log('❌ La colección pagos_movimientos sigue oculta');
        process.exitCode = 1;
      }
    } else {
      console.log('❌ La colección pagos_movimientos no existe en directus_collections');
      process.exitCode = 1;
    }

    // Permiso READ para política 'Vendedores'
    const [permRows] = await conn.query(
      "SELECT dp.id AS policy_id, dp.name AS policy_name, dperm.id AS perm_id, dperm.collection, dperm.action " +
      "FROM directus_policies dp " +
      "LEFT JOIN directus_permissions dperm ON dperm.policy = dp.id AND dperm.collection = 'pagos_movimientos' AND dperm.action = 'read' " +
      "WHERE dp.name = 'Vendedores' LIMIT 1",
    );
    if (Array.isArray(permRows) && permRows.length > 0) {
      const row = permRows[0];
      if (row?.perm_id) {
        console.log('✅ Permiso READ para pagos_movimientos vinculado a política Vendedores existe. ID:', row.perm_id);
      } else {
        console.log('❌ No existe permiso READ para pagos_movimientos en la política Vendedores');
        process.exitCode = 1;
      }
    } else {
      console.log('❌ No se encontró la política Vendedores');
      process.exitCode = 1;
    }
  } catch (e) {
    console.error('❌ Error verificando visibilidad/permisos de pagos_movimientos:', e);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();


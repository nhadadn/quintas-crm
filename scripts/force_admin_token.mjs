import mysql from 'mysql2/promise';
import 'dotenv/config';

const TOKEN = 'quintas_admin_token_2026';

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
    const [role] = await conn.query(
      "SELECT id FROM directus_roles WHERE LOWER(name) = 'administrator' LIMIT 1",
    );
    const roleId = role?.[0]?.id;
    if (!roleId) {
      console.error("❌ No se encontró el rol 'Administrator' en directus_roles");
      process.exit(1);
    }
    // Verifica que la columna 'token' existe
    const [cols] = await conn.query(
      "SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'directus_users' AND column_name = 'token'",
    );
    const hasToken = cols?.[0]?.c > 0;
    if (!hasToken) {
      console.error("❌ La columna 'directus_users.token' no existe en esta instancia. Genera un token vía API /users/me/tokens");
      process.exit(1);
    }
    // Liberar el token si ya lo tiene otro usuario
    const [exists] = await conn.query(
      'SELECT id, role FROM directus_users WHERE token = ? LIMIT 1',
      [TOKEN],
    );
    const holder = exists?.[0];
    if (holder && holder.role !== roleId) {
      await conn.query('UPDATE directus_users SET token = NULL WHERE id = ?', [holder.id]);
      console.log(`ℹ️ Token '${TOKEN}' liberado del usuario ${holder.id}`);
    }
    // Seleccionar un usuario administrador “principal”
    const [admins] = await conn.query('SELECT id FROM directus_users WHERE role = ? LIMIT 1', [
      roleId,
    ]);
    const adminId = admins?.[0]?.id;
    if (!adminId) {
      console.error('❌ No hay usuarios con rol Administrator');
      process.exit(1);
    }
    // Limpiar el token en otros usuarios admin que ya tuvieran este mismo token (defensivo)
    await conn.query('UPDATE directus_users SET token = NULL WHERE token = ? AND id <> ?', [
      TOKEN,
      adminId,
    ]);
    // Asignar el token al admin principal
    const [res] = await conn.query('UPDATE directus_users SET token = ? WHERE id = ?', [
      TOKEN,
      adminId,
    ]);
    console.log(
      `✅ Token '${TOKEN}' inyectado en la base de datos de Directus para el usuario ${adminId}. Filas afectadas: ${
        (res && res.affectedRows) || 0
      }`,
    );
  } catch (e) {
    console.error('❌ Error inyectando token:', e);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  console.log('🔌 Conectando a base de datos para verificar token...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
  });

  try {
    const TOKEN = process.env.NEXT_PUBLIC_DIRECTUS_STATIC_TOKEN || 'test-token';
    console.log(`🔍 Buscando token: ${TOKEN}`);

    const [users] = await conn.execute(
      'SELECT id, email, role, token FROM directus_users WHERE token = ?',
      [TOKEN]
    );

    if (users.length > 0) {
      console.log('✅ Token encontrado en usuario:', users[0].email);
    } else {
      console.log('⚠️ Token NO encontrado. Inyectando en usuario admin...');

      // Buscar usuario admin (admin@example.com o cualquiera con rol admin)
      const [admins] = await conn.execute(
        'SELECT id FROM directus_users WHERE email = "admin@example.com" LIMIT 1'
      );

      let adminId;
      if (admins.length > 0) {
        adminId = admins[0].id;
      } else {
        // Fallback: Buscar primer usuario con rol Administrator
        const [roles] = await conn.execute(
          'SELECT id FROM directus_roles WHERE name = "Administrator" LIMIT 1'
        );
        if (roles.length > 0) {
          const [usersByRole] = await conn.execute(
            'SELECT id FROM directus_users WHERE role = ? LIMIT 1',
            [roles[0].id]
          );
          if (usersByRole.length > 0) adminId = usersByRole[0].id;
        }
      }

      if (adminId) {
        await conn.execute('UPDATE directus_users SET token = ? WHERE id = ?', [TOKEN, adminId]);
        console.log(`✅ Token "${TOKEN}" asignado al usuario ID: ${adminId}`);
      } else {
        console.error('❌ No se encontró ningún usuario administrador para asignar el token.');
      }
    }

    // Verificar permisos públicos (solo para estar seguros, aunque usaremos token)
    // En Directus los permisos públicos son role = NULL
  } catch (e) {
    console.error('❌ Error:', e);
  } finally {
    await conn.end();
  }
}

run();

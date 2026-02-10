const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  console.log('Conectando a base de datos...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'quintas_crm',
  });

  try {
    console.log('Buscando rol de administrador...');

    // Intento 1: Buscar por nombre directamente (más seguro en versiones viejas)
    let adminRoleId = null;
    const [rolesByName] = await conn.execute(
      'SELECT id FROM directus_roles WHERE name = "Administrator" OR name = "Admin"'
    );

    if (rolesByName.length > 0) {
      adminRoleId = rolesByName[0].id;
      console.log(`Rol de administrador encontrado por nombre: ${adminRoleId}`);
    } else {
      // Intento 2: Buscar por admin_access (si existe la columna)
      try {
        const [roles] = await conn.execute('SELECT id FROM directus_roles WHERE admin_access = 1');
        if (roles.length > 0) {
          adminRoleId = roles[0].id;
          console.log(`Rol de administrador encontrado por admin_access: ${adminRoleId}`);
        }
      } catch (err) {
        console.log('Columna admin_access no existe, omitiendo búsqueda por flag.');
      }
    }

    if (adminRoleId) {
      console.log(`Actualizando token para usuarios con rol ${adminRoleId}...`);
      const [res] = await conn.execute('UPDATE directus_users SET token = ? WHERE role = ?', [
        'admin_token_quintas_2026',
        adminRoleId,
      ]);
      console.log(`Token actualizado en ${res.affectedRows} usuarios (por rol).`);
    }

    // Fallback: Actualizar por email común si no se actualizó nada
    console.log('Asegurando usuario admin@example.com...');
    const [resEmail] = await conn.execute('UPDATE directus_users SET token = ? WHERE email = ?', [
      'admin_token_quintas_2026',
      'admin@example.com',
    ]);
    console.log(`Token actualizado en ${resEmail.affectedRows} usuarios (por email).`);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await conn.end();
  }
}

run();

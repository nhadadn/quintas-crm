const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifySeedData() {
  console.log('Iniciando verificación de datos de prueba...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'quintas_otinapaV2',
    port: process.env.DB_PORT || 3306,
  });

  try {
    // 1. Verificar Rol "Cliente"
    console.log('\n1. Verificando Rol "Cliente"...');
    const [roles] = await connection.query(
      'SELECT id, name FROM directus_roles WHERE name = "Cliente"'
    );
    if (roles.length === 0) {
      console.error('❌ ERROR: Rol "Cliente" no encontrado.');
    } else {
      console.log(`✅ Rol encontrado: ${roles[0].name} (${roles[0].id})`);
    }

    // 2. Verificar Usuario de Prueba
    console.log('\n2. Verificando Usuario de Prueba (cliente.prueba@quintas.com)...');
    const [users] = await connection.query(
      'SELECT id, email, role, status FROM directus_users WHERE email = "cliente.prueba@quintas.com"'
    );
    let userId = null;
    if (users.length === 0) {
      console.error('❌ ERROR: Usuario de prueba no encontrado.');
    } else {
      userId = users[0].id;
      console.log(`✅ Usuario encontrado: ${users[0].email}`);
      console.log(`   ID: ${userId}`);
      console.log(`   Estatus: ${users[0].status}`);

      if (roles.length > 0 && users[0].role === roles[0].id) {
        console.log('   ✅ Rol asignado correctamente.');
      } else {
        console.error(`   ❌ Rol incorrecto. Esperado: ${roles[0]?.id}, Actual: ${users[0].role}`);
      }
    }

    // 3. Verificar Cliente CRM Vinculado
    if (userId) {
      console.log('\n3. Verificando Vinculación en tabla "clientes"...');
      const [clientes] = await connection.query(
        'SELECT id, nombre, email, user_id, rfc FROM clientes WHERE user_id = ?',
        [userId]
      );

      if (clientes.length === 0) {
        console.error(
          '❌ ERROR: No se encontró registro en tabla "clientes" vinculado a este usuario.'
        );
        // Intentar buscar por email para ver si existe pero sin vinculo
        const [clientesByEmail] = await connection.query(
          'SELECT id, user_id FROM clientes WHERE email = "cliente.prueba@quintas.com"'
        );
        if (clientesByEmail.length > 0) {
          console.warn(
            `⚠️ Existe cliente con ese email, pero user_id es: ${clientesByEmail[0].user_id}`
          );
        }
      } else {
        console.log(`✅ Registro CRM encontrado: ${clientes[0].nombre} (${clientes[0].email})`);
        console.log(`   RFC: ${clientes[0].rfc}`);
        console.log(`   Link correcto: clientes.user_id = ${clientes[0].user_id}`);
      }
    }

    // 4. Verificar Permisos (Policy-based)
    console.log('\n4. Verificando Permisos RLS (Policy-based)...');
    if (roles.length > 0) {
      // Obtener Policies del Rol
      const [accessList] = await connection.query(
        'SELECT policy FROM directus_access WHERE role = ?',
        [roles[0].id]
      );

      if (accessList.length === 0) {
        console.warn('⚠️ El rol no tiene policies asignadas en directus_access.');
      } else {
        console.log(`✅ Se encontraron ${accessList.length} policies asociadas al rol.`);

        for (const access of accessList) {
          const policyId = access.policy;
          console.log(`\n   🔍 Analizando Policy: ${policyId}`);

          // Verificar nombre policy
          const [policies] = await connection.query(
            'SELECT name FROM directus_policies WHERE id = ?',
            [policyId]
          );
          if (policies.length > 0) {
            console.log(`   Nombre: ${policies[0].name}`);
          }

          const [perms] = await connection.query(
            'SELECT collection, action, permissions FROM directus_permissions WHERE policy = ? AND collection = "clientes"',
            [policyId]
          );
          if (perms.length > 0) {
            console.log('   ✅ Permisos para "clientes" configurados:');
            perms.forEach((p) => {
              console.log(`      - Action: ${p.action}`);
              try {
                // console.log('        Permissions:', JSON.stringify(JSON.parse(p.permissions), null, 2));
              } catch (e) {
                // console.log('        Permissions (raw):', p.permissions);
              }
            });
          } else {
            console.warn(`   ⚠️ Sin permisos explícitos para "clientes" en esta policy.`);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error fatal durante la verificación:', err);
  } finally {
    await connection.end();
  }
}

verifySeedData();

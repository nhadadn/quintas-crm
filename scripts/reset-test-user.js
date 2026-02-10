const http = require('http');

const TOKEN = 'test-token'; // El token que acabamos de inyectar al admin
const EMAIL = 'cliente.prueba@quintas.com';
const PASSWORD = 'password123';

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8055,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject({ status: res.statusCode, error: json });
          }
        } catch (e) {
          reject({ status: res.statusCode, error: body });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  try {
    console.log('🔍 Buscando usuario de prueba...');
    const users = await request('GET', `/users?filter[email][_eq]=${EMAIL}`);

    let userId;
    if (users.data.length > 0) {
      userId = users.data[0].id;
      console.log(`✅ Usuario encontrado: ${userId}`);
    } else {
      console.log('⚠️ Usuario no encontrado. Se debe crear manualmente o correr seed.');
      return;
    }

    console.log('🔐 Actualizando contraseña...');
    await request('PATCH', `/users/${userId}`, { password: PASSWORD });
    console.log(`✅ Contraseña actualizada exitosamente a: ${PASSWORD}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();

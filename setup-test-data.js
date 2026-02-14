const http = require('http');

function post(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 8055,
        path: path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http
      .get('http://localhost:8055' + path, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

async function run() {
  try {
    console.log('Creating/Updating Test User...');
    const userRes = await post('/test-endpoint/create-test-user');
    console.log('User Result:', userRes);

    console.log('Setting Permissions...');
    const permRes = await post('/test-endpoint/setup-permissions');
    console.log('Permissions Result:', permRes);

    console.log('Inspecting Data...');
    const dataRes = await get('/test-endpoint/inspect-data');
    console.log('Data Inspection:', dataRes);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();

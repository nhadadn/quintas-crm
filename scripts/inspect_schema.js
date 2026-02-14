// const fetch = require('node-fetch'); // Native fetch in Node 18+

const DIRECTUS_URL = 'http://localhost:8055';

async function inspect() {
  // Login
  let token;
  console.log('Attempting login...');
  try {
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@quintas.com',
        password: 'admin_quintas_2024',
      }),
    });

    console.log('Login status:', loginRes.status);

    if (!loginRes.ok) {
      const text = await loginRes.text();
      console.log('Login response:', text);
      throw new Error(`Login failed: ${loginRes.status}`);
    }

    const loginData = await loginRes.json();
    token = loginData.data.access_token;
    console.log('✅ Login successful, token:', token ? 'Found' : 'Missing');
  } catch (e) {
    console.error('Login error:', e);
    return;
  }

  // Check if clients has created_by by fetching one item
  try {
    const clientRes = await fetch(`${DIRECTUS_URL}/items/clientes?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (clientRes.ok) {
      const clientJson = await clientRes.json();
      if (clientJson.data.length > 0) {
        console.log('Client sample keys:', Object.keys(clientJson.data[0]));
      } else {
        console.log('No clients found to inspect keys.');
      }
    }
  } catch (e) {
    console.error('Error fetching client sample:', e);
  }

  const collections = ['lotes', 'ventas', 'clientes', 'pagos', 'comisiones'];

  for (const col of collections) {
    try {
      const res = await fetch(`${DIRECTUS_URL}/fields/${col}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.log(`Failed to fetch ${col}: ${res.status} ${res.statusText}`);
        continue;
      }

      const json = await res.json();
      const fields = json.data.map((f) => f.field);
      console.log(`\nFields for ${col}:`, fields.join(', '));

      if (col === 'ventas') console.log(`  - vendedor_id exists?`, fields.includes('vendedor_id'));
      if (col === 'clientes')
        console.log(`  - vendedor_id exists?`, fields.includes('vendedor_id'));
      if (col === 'pagos') console.log(`  - venta_id exists?`, fields.includes('venta_id'));
      if (col === 'comisiones')
        console.log(`  - vendedor_id exists?`, fields.includes('vendedor_id'));
    } catch (e) {
      console.error(`Error fetching ${col}:`, e.message);
    }
  }
}

inspect();

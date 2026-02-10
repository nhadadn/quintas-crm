const DIRECTUS_URL = 'http://localhost:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function check() {
  // Login
  const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  const { data: { access_token } } = await loginRes.json();
  const headers = { Authorization: `Bearer ${access_token}` };

  try {
      console.log('Fetching policies...');
      const res = await fetch(`${DIRECTUS_URL}/policies`, { headers });
      if (res.ok) {
          const json = await res.json();
          console.log(`Found ${json.data.length} policies.`);
          console.log('First policy:', JSON.stringify(json.data[0], null, 2));
      } else {
          console.log(`Policies endpoint failed: ${res.status}`);
      }
  } catch (e) {
      console.log('Error fetching policies:', e.message);
  }
}

check();

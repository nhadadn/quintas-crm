const DIRECTUS_URL = 'http://localhost:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

const USER_ID = '3880dee8-fb81-48aa-858c-4e6c9a269588';
const POLICY_ID = '425cf8a4-8280-4d28-8be1-fdb0e8780238';

async function attachPolicy() {
  console.log('📎 Attaching Policy to User directly...');

  const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const token = (await loginRes.json()).data.access_token;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Check user current policies
  const userRes = await fetch(`${DIRECTUS_URL}/users/${USER_ID}`, { headers });
  const userData = await userRes.json();
  console.log('User Policies:', userData.data.policies);

  // Update user
  const updateRes = await fetch(`${DIRECTUS_URL}/users/${USER_ID}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      policies: [POLICY_ID],
    }),
  });

  if (updateRes.ok) {
    console.log('✅ Policy attached to USER successfully!');
  } else {
    console.error('❌ Failed to attach policy to user:', await updateRes.text());
  }
}

attachPolicy();

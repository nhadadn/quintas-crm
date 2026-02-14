const DIRECTUS_URL = 'http://localhost:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

const TARGET_POLICY_ID = 'cf1f0fe8-fa59-4232-94a8-5c7fc8279043';

async function inspectPolicy() {
  console.log('🔍 Inspecting Policy:', TARGET_POLICY_ID);

  const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const token = (await loginRes.json()).data.access_token;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const res = await fetch(`${DIRECTUS_URL}/policies/${TARGET_POLICY_ID}`, { headers });
  if (res.ok) {
    const data = await res.json();
    console.log('Policy Name:', data.data.name);
    console.log('Policy Permissions:', data.data.permissions); // might be ID list or objects
  } else {
    console.log('❌ Could not fetch policy:', res.status);
  }

  // Also check permissions endpoint filtering by this policy
  const permsRes = await fetch(
    `${DIRECTUS_URL}/permissions?filter[policy][_eq]=${TARGET_POLICY_ID}`,
    { headers }
  );
  const permsData = await permsRes.json();
  console.log(`Found ${permsData.data.length} permissions linked to this policy.`);
  permsData.data.forEach((p) => console.log(` - ${p.collection}: ${p.action}`));
}

inspectPolicy();

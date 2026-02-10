
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function checkField() {
  console.log('--- Checking Ventas ID Field ---');
  
  try {
    // Login
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    
    if (!loginRes.ok) {
      console.error('Login failed:', await loginRes.text());
      return;
    }

    const { data: { access_token } } = await loginRes.json();
    
    // Get Field Info
    const fieldRes = await fetch(`${DIRECTUS_URL}/fields/ventas/id`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    if (!fieldRes.ok) {
        console.error('Field fetch failed:', await fieldRes.text());
        return;
    }

    const field = await fieldRes.json();
    console.log(JSON.stringify(field, null, 2));
  } catch (error) {
      console.error('Script error:', error);
  }
}

checkField();

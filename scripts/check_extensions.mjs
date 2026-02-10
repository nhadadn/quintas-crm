
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function testExtensions() {
    try {
        console.log('Logging in...');
        const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });
        
        if (!loginRes.ok) throw new Error('Login failed');
        
        const { data: { access_token } } = await loginRes.json();
        const headers = { Authorization: `Bearer ${access_token}` };

        console.log('--- Testing Reportes ---');
        const repRes = await fetch(`${DIRECTUS_URL}/reportes/`, { headers });
        if (repRes.ok) {
            console.log('✅ Reportes Response:', await repRes.text());
        } else {
            console.error('❌ Reportes Failed:', await repRes.text());
        }

        console.log('--- Testing CRM KPIs ---');
        const kpiRes = await fetch(`${DIRECTUS_URL}/crm-kpis/`, { headers });
        if (kpiRes.ok) {
            console.log('✅ CRM KPIs Response:', await kpiRes.text());
        } else {
            console.error('❌ CRM KPIs Failed:', await kpiRes.text());
        }

    } catch (error) {
        console.error(error);
    }
}

testExtensions();

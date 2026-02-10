
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function testDashboard() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });
        
        if (!loginRes.ok) throw new Error('Login failed');
        
        const { data: { access_token } } = await loginRes.json();
        const headers = { Authorization: `Bearer ${access_token}` };

        // Test Root
        console.log('Testing GET /crm-analytics/ ...');
        const rootRes = await fetch(`${DIRECTUS_URL}/crm-analytics/`, { headers });
        if (rootRes.ok) {
            console.log('✅ Root Response:', await rootRes.text());
        } else {
            console.error('❌ Root Failed:', await rootRes.text());
        }

        // 2. Test KPIs
        console.log('Testing GET /crm-analytics/kpis...');
        let kpiRes = await fetch(`${DIRECTUS_URL}/crm-analytics/kpis`, { headers });
        if (!kpiRes.ok) {
            console.log('Trying fallback path /crm-analytics/kpis...');
            kpiRes = await fetch(`${DIRECTUS_URL}/crm-analytics/kpis`, { headers });
        }
        
        if (kpiRes.ok) {
            console.log('✅ KPIs Response:', await kpiRes.json());
        } else {
            console.error('❌ KPIs Failed:', await kpiRes.text());
        }

        // 3. Test Ventas por Mes
        console.log('Testing GET /crm-analytics/ventas-por-mes...');
        const mesRes = await fetch(`${DIRECTUS_URL}/crm-analytics/ventas-por-mes`, { headers });
        if (mesRes.ok) {
            console.log('✅ Ventas Mes Response:', await mesRes.json());
        } else {
            console.error('❌ Ventas Mes Failed:', await mesRes.text());
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

testDashboard();

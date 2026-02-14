async function testDashboardEndpoints() {
  try {
    // 1. Login
    const loginRes = await fetch('http://localhost:8055/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@quintas.com',
        password: 'admin_quintas_2024',
      }),
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error('Login failed');
    const token = loginData.data.access_token;

    // 2. Test KPIs
    console.log('Testing GET /crm-analytics/kpis...');
    let kpiRes = await fetch('http://localhost:8055/crm-analytics/kpis', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('KPIs Status (crm-analytics):', kpiRes.status);

    if (kpiRes.status === 404) {
      console.log('Testing GET /analytics-custom/kpis...');
      kpiRes = await fetch('http://localhost:8055/analytics-custom/kpis', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('KPIs Status (analytics-custom):', kpiRes.status);
    }

    if (!kpiRes.ok) console.log('KPI Body:', await kpiRes.text());
    else console.log('KPI Body:', await kpiRes.json());

    // 3. Test Ventas
    console.log('Testing GET /crm-analytics/ventas-por-mes...');
    const ventasRes = await fetch('http://localhost:8055/crm-analytics/ventas-por-mes', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Ventas Status:', ventasRes.status);
    if (!ventasRes.ok) console.log('Ventas Body:', await ventasRes.text());
    else console.log('Ventas Body:', await ventasRes.json());
  } catch (error) {
    console.error('Test Failed:', error.message);
  }
}

testDashboardEndpoints();

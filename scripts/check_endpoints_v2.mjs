
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function checkEndpoints() {
  console.log('🔍 Checking Endpoints...');
  try {
    // 1. Login
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    
    if (!loginRes.ok) {
        console.error('❌ Login failed:', loginRes.status);
        const text = await loginRes.text();
        console.error(text);
        return;
    }

    const { data: { access_token } } = await loginRes.json();
    console.log('✅ Login successful');
    
    console.log('\n👥 Checking /clientes...');
    const clientesRes = await fetch(`${DIRECTUS_URL}/clientes`, {
        headers: { Authorization: `Bearer ${access_token}` }
    });
    console.log('Status:', clientesRes.status);
    if (!clientesRes.ok) {
        console.log('Response:', await clientesRes.text());
    }

    
    console.log('\n👥 Checking /directus-endpoint-clientes...');
    const clientesRes2 = await fetch(`${DIRECTUS_URL}/directus-endpoint-clientes`, {
        headers: { Authorization: `Bearer ${access_token}` }
    });
    console.log('Status:', clientesRes2.status);

    console.log('\n👥 Checking /quintas-crm/clientes...');
    const clientesRes3 = await fetch(`${DIRECTUS_URL}/quintas-crm/clientes`, {
        headers: { Authorization: `Bearer ${access_token}` }
    });
    console.log('Status:', clientesRes3.status);
console.log('\n💰 Checking /comisiones/calcular...');
    const comisionesRes = await fetch(`${DIRECTUS_URL}/comisiones/calcular?venta_id=1`, {
        headers: { Authorization: `Bearer ${access_token}` }
    });
    console.log('Status:', comisionesRes.status);

    console.log('\n📍 Checking /mapa-lotes...');
    const mapaRes = await fetch(`${DIRECTUS_URL}/mapa-lotes`, {
        headers: { Authorization: `Bearer ${access_token}` }
    });
    console.log('Status:', mapaRes.status);
    if (mapaRes.ok) {
        const mapaData = await mapaRes.json();
        console.log('Features count:', mapaData.features ? mapaData.features.length : 'N/A');
    } else {
        console.log('Response:', await mapaRes.text());
        
        // Try alternative path
        console.log('\n📍 Checking /directus-endpoint-mapa-lotes (fallback)...');
        const mapaRes2 = await fetch(`${DIRECTUS_URL}/directus-endpoint-mapa-lotes`, {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        console.log('Status:', mapaRes2.status);
    }

    // 3. Check /crm-analytics/ventas-por-vendedor
    console.log('\n📊 Checking /crm-analytics/ventas-por-vendedor...');
    const analyticsRes = await fetch(`${DIRECTUS_URL}/crm-analytics/ventas-por-vendedor`, {
        headers: { Authorization: `Bearer ${access_token}` }
    });
    console.log('Status:', analyticsRes.status);
    if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        console.log('Data:', JSON.stringify(analyticsData, null, 2).substring(0, 200) + '...');
    } else {
        console.log('Response:', await analyticsRes.text());

        // Try alternative path
        console.log('\n📊 Checking /directus-endpoint-crm-analytics/ventas-por-vendedor (fallback)...');
        const analyticsRes2 = await fetch(`${DIRECTUS_URL}/directus-endpoint-crm-analytics/ventas-por-vendedor`, {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        console.log('Status:', analyticsRes2.status);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkEndpoints();

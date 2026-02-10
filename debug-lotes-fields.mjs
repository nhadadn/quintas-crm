import fetch from 'node-fetch';

const DIRECTUS_URL = 'http://localhost:8055';
const EMAIL = 'admin@quintas.com';
const PASSWORD = 'admin_quintas_2024';

async function main() {
  try {
    // 1. Login
    console.log('Logging in...');
    const authRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });
    const authData = await authRes.json();
    if (!authData.data) throw new Error(JSON.stringify(authData));
    const token = authData.data.access_token;
    console.log('Logged in. Token obtained.');

    // 2. Get Fields
    console.log('Fetching fields for lotes...');
    try {
      const fieldsRes = await fetch(`${DIRECTUS_URL}/fields/lotes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fieldsData = await fieldsRes.json();
      const fields = fieldsData.data.map(f => ({ 
        field: f.field, 
        type: f.type, 
        nullable: f.meta?.nullable,
        required: f.meta?.required,
        default_value: f.schema?.default_value 
      }));
      console.log('Fields in lotes:', JSON.stringify(fields, null, 2));
    } catch (e) {
      console.error('Error fetching fields:', e.message);
    }

    // 3. Try Create Lote
    console.log('Attempting to create lote...');
    const loteData = {
      numero_lote: `D${Date.now().toString().slice(-6)}`,
      precio_lista: 120000,
      estatus: 'disponible',
      etapa: '1',
      fondo_m: 40,
      geometria: { type: 'Point', coordinates: [0, 0] },
      latitud: 24.0,
      longitud: -104.0,
      manzana: 'M1',
      zona: 'Z1'
    };

    try {
      const createRes = await fetch(`${DIRECTUS_URL}/items/lotes`, {
        method: 'POST',
        headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(loteData)
      });
      const createData = await createRes.json();
      if (createRes.ok) {
          console.log('✅ Lote created successfully:', createData.data.id);
      } else {
          console.error('❌ Error creating lote:', JSON.stringify(createData, null, 2));
      }
    } catch (e) {
      console.error('Error creating lote:', e.message);
    }

    // 4. Test Existing Endpoints (Baseline)
    console.log('Testing /comisiones endpoint...');
    try {
        const comRes = await fetch(`${DIRECTUS_URL}/comisiones`, {
             headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`Endpoint /comisiones Status: ${comRes.status}`);
    } catch(e) { console.error(e.message); }

    console.log('Testing /mapa-lotes endpoint...');
    try {
        const mapRes = await fetch(`${DIRECTUS_URL}/mapa-lotes`, {
             headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`Endpoint /mapa-lotes Status: ${mapRes.status}`);
        
        const mapPingRes = await fetch(`${DIRECTUS_URL}/mapa-lotes/ping`, {
             headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`Endpoint /mapa-lotes/ping Status: ${mapPingRes.status}`);

    } catch(e) { console.error(e.message); }

    console.log('Testing /custom-oauth/ping endpoint...');
    try {
        const oauthPingRes = await fetch(`${DIRECTUS_URL}/custom-oauth/ping`);
        console.log(`Endpoint /custom-oauth/ping Status: ${oauthPingRes.status}`);
        if (oauthPingRes.status !== 200) {
             const oauthRootRes = await fetch(`${DIRECTUS_URL}/custom-oauth`);
             console.log(`Endpoint /custom-oauth (root) Status: ${oauthRootRes.status}`);
        }
    } catch(e) { console.error('Error /custom-oauth/ping:', e.message); }

    console.log('Testing OAuth Endpoint existence...');
    try {
        const oauthRes = await fetch(`${DIRECTUS_URL}/custom-oauth/authorize`);
        console.log(`OAuth Endpoint /custom-oauth/authorize Status: ${oauthRes.status}`);
    } catch(e) { console.error('Error checking OAuth:', e.message); }

    console.log('Testing CRM Analytics Endpoint existence...');
    try {
        const analyticsRes = await fetch(`${DIRECTUS_URL}/analytics-custom/resumen`, {
             headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`CRM Analytics /analytics-custom/resumen Status: ${analyticsRes.status}`);
        if (analyticsRes.status !== 200) {
             console.log('❌ CRM Error Body:', await analyticsRes.text());
        } else {
             console.log('✅ CRM Analytics Response:', await analyticsRes.json());
        }
    } catch(e) { console.error('Error checking CRM Analytics:', e.message); }

  } catch (error) {
    console.error('Fatal Error:', error.message);
  }
}

main();
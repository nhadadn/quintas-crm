
import fetch from 'node-fetch';

const DIRECTUS_URL = 'http://0.0.0.0:8055';
const EMAIL = 'admin@quintas.com';
const PASSWORD = 'admin_quintas_2024';

async function main() {
    console.log('Authenticating...');
    const authRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });

    if (!authRes.ok) {
        console.error('Login failed:', await authRes.text());
        process.exit(1);
    }

    const { data } = await authRes.json();
    const token = data.access_token;
    console.log('Logged in.');

    const pathsToTest = [
        // OAuth
        { method: 'POST', path: '/oauth/authorize', label: 'OAuth (Old)' },
        { method: 'POST', path: '/oauth-server/authorize', label: 'OAuth Server (Short)' },
        { method: 'POST', path: '/directus-endpoint-oauth-server/authorize', label: 'OAuth Server (Full)' },
        { method: 'GET', path: '/directus-endpoint-oauth-server/ping', label: 'OAuth Server Ping (Full)' },
        
        // CRM Analytics
        { method: 'GET', path: '/crm-analytics/resumen', label: 'CRM (Path config)' },
        { method: 'GET', path: '/directus-endpoint-crm-analytics/resumen', label: 'CRM (Folder Name)' },
        { method: 'GET', path: '/analytics/resumen', label: 'CRM (Short)' },
        
        // Mapa Lotes (Control)
        { method: 'GET', path: '/mapa-lotes', label: 'Mapa Lotes (Control)' },
        { method: 'GET', path: '/directus-endpoint-mapa-lotes', label: 'Mapa Lotes (Folder/Name check)' }
    ];

    console.log('\n--- Endpoint Discovery ---');
    for (const test of pathsToTest) {
        try {
            const res = await fetch(`${DIRECTUS_URL}${test.path}`, {
                method: test.method,
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: test.method === 'POST' ? JSON.stringify({}) : undefined
            });
            console.log(`[${res.status}] ${test.label}: ${test.path}`);
            if (res.status !== 404) {
                if (res.status === 200 || res.status === 400 || res.status === 401 || res.status === 500) {
                     console.log('   >>> FOUND! (Status indicates route exists)');
                     if (res.status === 400) {
                         const txt = await res.text();
                         console.log('   >>> Response:', txt.substring(0, 100));
                     }
                }
            }
        } catch (e) {
            console.error(`Error testing ${test.path}:`, e.message);
        }
    }
}

main();

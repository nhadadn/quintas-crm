// scripts/fix_bad_client.mjs
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function fixBadClient() {
    console.log('--- Fixing Bad Client Record ---');
    
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    
    const { data: { access_token } } = await loginRes.json();
    const headers = { 
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
    };

    // 1. Find the bad client
    // Since ID is empty string, we might need to search by other fields or list all
    const listRes = await fetch(`${DIRECTUS_URL}/items/clientes`, { headers });
    const listData = await listRes.json();
    
    const badClients = listData.data.filter(c => !c.id || c.id === '');
    console.log(`Found ${badClients.length} bad client records`);

    for (const client of badClients) {
        console.log('Deleting bad client with empty ID...');
        // Deleting by ID might be tricky if ID is empty. 
        // Directus delete endpoint is DELETE /items/:collection/:id
        // If ID is empty string, it might be interpreted as /items/clientes/
        // We might need to use delete by query if supported, or just delete all if it's a test env.
        // Directus supports bulk delete: DELETE /items/clientes with body [id1, id2]
        // Let's try passing the empty string in the array.
        
        const deleteRes = await fetch(`${DIRECTUS_URL}/items/clientes`, {
            method: 'DELETE',
            headers,
            body: JSON.stringify(['']) // Trying to delete ID ""
        });
        
        if (deleteRes.status === 204) {
            console.log('Deleted successfully');
        } else {
            console.log('Delete failed:', deleteRes.status);
            // Fallback: Delete *ALL* clients if this is a dev env and only has junk data
            // But let's be careful.
            // If delete failed, maybe we can delete via SQL if needed, but let's try creating a new one first.
        }
    }

    // 2. Create a new valid client
    console.log('Creating a new valid client...');
    const newClient = {
        nombre: 'Cliente',
        apellido_paterno: 'Valido',
        email: `cliente.valido.${Date.now()}@test.com`,
        telefono: '5559876543',
        rfc: `XAXX01010100${Math.floor(Math.random()*9)}`,
        tipo: 'Individual',
        estatus: 'prospecto'
    };

    const createRes = await fetch(`${DIRECTUS_URL}/items/clientes`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newClient)
    });

    if (createRes.ok) {
        const createData = await createRes.json();
        console.log('Created valid client:', createData.data.id);
        console.log('Full object:', JSON.stringify(createData.data, null, 2));
    } else {
        const err = await createRes.json();
        console.error('Failed to create client:', JSON.stringify(err, null, 2));
    }
}

fixBadClient();

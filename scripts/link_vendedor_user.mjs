
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function linkVendedor() {
    try {
        console.log('--- Linking Vendedor User ---');
        
        // 1. Login
        const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });
        
        if (!loginRes.ok) {
            console.error('Login failed');
            return;
        }
        
        const { data: { access_token } } = await loginRes.json();
        const headers = { 
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json'
        };

        // 2. Find target user
        const targetEmail = 'erick.navarrete@gmail.com';
        const usersRes = await fetch(`${DIRECTUS_URL}/users?filter[email][_eq]=${targetEmail}`, { headers });
        const usersData = await usersRes.json();
        
        let userToLink;
        if (usersData.data.length > 0) {
            userToLink = usersData.data[0];
            console.log(`Found user: ${userToLink.first_name} ${userToLink.last_name} (${userToLink.id})`);
        } else {
            console.log('Target user not found. Checking if any Vendedor exists...');
             // Fetch users with Vendedor role
             const roleRes = await fetch(`${DIRECTUS_URL}/roles?filter[name][_eq]=Vendedor`, { headers });
             const roleData = await roleRes.json();
             if (roleData.data.length > 0) {
                 const roleId = roleData.data[0].id;
                 const anyUsersRes = await fetch(`${DIRECTUS_URL}/users?filter[role][_eq]=${roleId}`, { headers });
                 const anyUsersData = await anyUsersRes.json();
                 if (anyUsersData.data.length > 0) {
                     userToLink = anyUsersData.data[0];
                     console.log(`Using fallback user: ${userToLink.first_name} ${userToLink.last_name} (${userToLink.id})`);
                 } else {
                     console.error('No Vendedor users found at all.');
                     return;
                 }
             } else {
                 console.error('Vendedor role not found.');
                 return;
             }
        }

        // 3. Find or Create Vendedor Item
        const vendedoresRes = await fetch(`${DIRECTUS_URL}/items/vendedores?filter[user_id][_eq]=${userToLink.id}`, { headers });
        const vendedoresData = await vendedoresRes.json();
        
        if (vendedoresData.data.length > 0) {
            console.log(`✅ User already linked to Vendedor item: ${vendedoresData.data[0].id}`);
            return;
        }
        
        // Check for existing vendor by name/email match
        const matchRes = await fetch(`${DIRECTUS_URL}/items/vendedores?filter[_or][0][nombre][_contains]=${userToLink.first_name}&filter[_or][1][email][_eq]=${userToLink.email}`, { headers });
        const matchData = await matchRes.json();
        
        if (matchData.data.length > 0) {
            const v = matchData.data[0];
            console.log(`Found existing Vendedor item matching name/email: ${v.nombre} (${v.id}). Linking...`);
            
            const updateRes = await fetch(`${DIRECTUS_URL}/items/vendedores/${v.id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ user_id: userToLink.id })
            });
            
            if (updateRes.ok) {
                console.log(`✅ Linked Vendedor ${v.id} to User ${userToLink.id}`);
            } else {
                console.error('Failed to link:', await updateRes.text());
            }
        } else {
            console.log(`Creating new Vendedor item for user...`);
            const createRes = await fetch(`${DIRECTUS_URL}/items/vendedores`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    nombre: `${userToLink.first_name} ${userToLink.last_name}`,
                    email: userToLink.email,
                    telefono: '555-555-5555',
                    user_id: userToLink.id
                })
            });
            
            if (createRes.ok) {
                const newItem = await createRes.json();
                console.log(`✅ Created and Linked Vendedor ${newItem.data.id} to User ${userToLink.id}`);
            } else {
                console.error('Failed to create Vendedor:', await createRes.text());
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

linkVendedor();

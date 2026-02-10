import fetch from 'node-fetch';

const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function addUserIdToVendedores() {
    console.log('--- Adding user_id to Vendedores ---');
    
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

    // 2. Create Field
    const fieldPayload = {
        field: "user_id",
        type: "uuid",
        schema: {
            is_nullable: true,
            foreign_key_column: "id",
            foreign_key_table: "directus_users",
            on_update: "CASCADE",
            on_delete: "SET NULL"
        },
        meta: {
            collection: "vendedores",
            field: "user_id",
            special: ["m2o"],
            interface: "select-dropdown-m2o",
            display: "user",
            display_options: {
                template: "{{first_name}} {{last_name}}"
            },
            readonly: false,
            hidden: false,
            width: "half",
            note: "Link to Directus User for login/permissions"
        }
    };

    console.log('Creating user_id field...');
    const createRes = await fetch(`${DIRECTUS_URL}/fields/vendedores`, {
        method: 'POST',
        headers,
        body: JSON.stringify(fieldPayload)
    });

    if (createRes.ok) {
        console.log('✅ user_id field created successfully');
    } else {
        const error = await createRes.json();
        if (error.errors && error.errors[0].message.includes('already exists')) {
             console.log('⚠️ Field user_id already exists');
        } else {
            console.error('❌ Error creating field:', JSON.stringify(error, null, 2));
        }
    }
}

addUserIdToVendedores();

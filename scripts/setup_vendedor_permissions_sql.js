const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: '127.0.0.1',
    user: 'root',
    password: 'narizon1',
    database: 'quintas_otinapaV2',
    port: 3306
};

const POLICY_ID = '425cf8a4-8280-4d28-8be1-fdb0e8780238';

async function setupPermissions() {
    console.log('🔧 Setting up Vendedor Permissions in DB...');
    const connection = await mysql.createConnection(DB_CONFIG);

    try {
        // 1. Clear existing permissions for this policy
        console.log('🧹 Clearing existing permissions...');
        await connection.execute('DELETE FROM directus_permissions WHERE policy = ?', [POLICY_ID]);

        // 2. Define Permissions
        const permissions = [
            // LOTES: Read All
            {
                collection: 'lotes',
                action: 'read',
                permissions: '{}', // All
                fields: '*'
            },
            // VENTAS: Create
            {
                collection: 'ventas',
                action: 'create',
                permissions: '{}', 
                fields: '*',
                presets: '{"vendedor_id": "$CURRENT_USER"}'
            },
            // VENTAS: Read Mine
            {
                collection: 'ventas',
                action: 'read',
                permissions: '{"vendedor_id": {"_eq": "$CURRENT_USER"}}',
                fields: '*'
            },
            // CLIENTES: Create
            {
                collection: 'clientes',
                action: 'create',
                permissions: '{}',
                fields: '*',
                presets: '{"user_created": "$CURRENT_USER"}'
            },
            // CLIENTES: Read Mine
            {
                collection: 'clientes',
                action: 'read',
                permissions: '{"user_created": {"_eq": "$CURRENT_USER"}}',
                fields: '*'
            },
             // CLIENTES: Update Mine
             {
                collection: 'clientes',
                action: 'update',
                permissions: '{"user_created": {"_eq": "$CURRENT_USER"}}',
                fields: '*'
            },
            // PAGOS: Read (via Venta)
            {
                collection: 'pagos',
                action: 'read',
                permissions: '{"venta_id": {"vendedor_id": {"_eq": "$CURRENT_USER"}}}',
                fields: '*'
            },
            // COMISIONES: Read Mine
            {
                collection: 'comisiones',
                action: 'read',
                permissions: '{"vendedor_id": {"_eq": "$CURRENT_USER"}}',
                fields: '*'
            },
            // USERS: Read Self
            {
                collection: 'directus_users',
                action: 'read',
                permissions: '{"id": {"_eq": "$CURRENT_USER"}}',
                fields: '*'
            },
             // USERS: Update Self
             {
                collection: 'directus_users',
                action: 'update',
                permissions: '{"id": {"_eq": "$CURRENT_USER"}}',
                fields: '*'
            }
        ];

        // 3. Insert Permissions
        console.log(`📝 Inserting ${permissions.length} permissions...`);
        for (const p of permissions) {
            await connection.execute(
                'INSERT INTO directus_permissions (policy, collection, action, permissions, fields, presets) VALUES (?, ?, ?, ?, ?, ?)',
                [POLICY_ID, p.collection, p.action, p.permissions, p.fields, p.presets || null]
            );
        }

        console.log('✅ Permissions setup complete.');

    } catch (err) {
        console.error('❌ SQL Error:', err);
    } finally {
        await connection.end();
    }
}

setupPermissions();

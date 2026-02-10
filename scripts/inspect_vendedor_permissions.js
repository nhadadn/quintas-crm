const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: '127.0.0.1',
    user: 'root',
    password: 'narizon1',
    database: 'quintas_otinapaV2',
    port: 3306
};

const POLICY_ID = '425cf8a4-8280-4d28-8be1-fdb0e8780238';

async function inspectPermissions() {
    console.log('🔍 Inspecting Permissions for Policy:', POLICY_ID);
    const connection = await mysql.createConnection(DB_CONFIG);

    try {
        const [perms] = await connection.execute(
            'SELECT * FROM directus_permissions WHERE policy = ?',
            [POLICY_ID]
        );

        if (perms.length === 0) {
            console.log('❌ No permissions found for this policy!');
        } else {
            console.log(`Found ${perms.length} permissions:`);
            perms.forEach(p => {
                console.log(` - Collection: ${p.collection}`);
                console.log(`   Action: ${p.action}`);
                console.log(`   Permissions: ${JSON.stringify(p.permissions)}`);
                console.log(`   Validation: ${JSON.stringify(p.validation)}`);
                console.log(`   Fields: ${p.fields}`);
                console.log('---');
            });
        }

    } catch (err) {
        console.error('❌ SQL Error:', err);
    } finally {
        await connection.end();
    }
}

inspectPermissions();

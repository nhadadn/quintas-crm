const mysql = require('mysql2/promise');

const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: 'password', 
    database: 'quintas_crm' 
};

async function fixVentasId() {
    console.log('--- Fixing Ventas ID Field ---');
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // 1. Check if field exists in directus_fields
        const [rows] = await connection.execute(
            'SELECT * FROM directus_fields WHERE collection = "ventas" AND field = "id"'
        );

        if (rows.length === 0) {
            console.log('Inserting id field into directus_fields for ventas...');
            await connection.execute(`
                INSERT INTO directus_fields (collection, field, special, interface, readonly, hidden, width)
                VALUES ('ventas', 'id', 'uuid', 'input', 1, 0, 'full')
            `);
        } else {
            console.log('Updating id field in directus_fields for ventas...');
            await connection.execute(`
                UPDATE directus_fields 
                SET special = 'uuid', interface = 'input', readonly = 1, hidden = 0 
                WHERE collection = 'ventas' AND field = 'id'
            `);
        }

        console.log('✅ Ventas ID field fixed.');
        await connection.end();
    } catch (e) {
        console.error('Error:', e);
    }
}

fixVentasId();

require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'narizon1',
  database: process.env.DB_DATABASE || 'quintas_otinapaV2',
  port: process.env.DB_PORT || 3306,
};

async function fixFields() {
  let connection;
  try {
    console.log('Connecting to database...', dbConfig.database);
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected!');

    const fieldsToInsert = [
      // LOTES
      {
        collection: 'lotes',
        field: 'estatus',
        interface: 'select-dropdown',
        options: JSON.stringify({
          choices: [
            { text: 'Disponible', value: 'disponible' },
            { text: 'Apartado', value: 'apartado' },
            { text: 'Vendido', value: 'vendido' },
          ],
        }),
      },
      { collection: 'lotes', field: 'numero_lote', interface: 'input' },
      { collection: 'lotes', field: 'precio_lista', interface: 'input' },
      { collection: 'lotes', field: 'etapa', interface: 'input' },
      { collection: 'lotes', field: 'fondo_m', interface: 'input' },
      { collection: 'lotes', field: 'geometria', interface: 'input-json' },
      { collection: 'lotes', field: 'latitud', interface: 'input' },
      { collection: 'lotes', field: 'longitud', interface: 'input' },
      { collection: 'lotes', field: 'manzana', interface: 'input' },
      { collection: 'lotes', field: 'zona', interface: 'input' },

      // CLIENTES
      { collection: 'clientes', field: 'estatus', interface: 'select-dropdown' },
      { collection: 'clientes', field: 'nombre', interface: 'input' },
      { collection: 'clientes', field: 'apellido_paterno', interface: 'input' },
      { collection: 'clientes', field: 'email', interface: 'input' },
      { collection: 'clientes', field: 'rfc', interface: 'input' },
      { collection: 'clientes', field: 'telefono', interface: 'input' },

      // VENTAS
      { collection: 'ventas', field: 'estatus', interface: 'select-dropdown' },
      { collection: 'ventas', field: 'monto_total', interface: 'input' },
      { collection: 'ventas', field: 'enganche', interface: 'input' },
      { collection: 'ventas', field: 'plazo_meses', interface: 'input' },
      { collection: 'ventas', field: 'metodo_pago', interface: 'select-dropdown' },
      { collection: 'ventas', field: 'fecha_venta', interface: 'datetime' },
    ];

    for (const item of fieldsToInsert) {
      const { collection, field, interface: iface, options } = item;
      console.log(`Registering field: ${collection}.${field}`);

      await connection.execute(
        `
        INSERT IGNORE INTO directus_fields (collection, field, special, interface, options, readonly, hidden, width)
        VALUES (?, ?, NULL, ?, ?, 0, 0, 'half')
      `,
        [collection, field, iface || 'input', options || null]
      );
    }

    console.log('✅ Fields registered successfully!');
  } catch (error) {
    console.error('❌ Error fixing fields:', error);
  } finally {
    if (connection) await connection.end();
  }
}

fixFields();

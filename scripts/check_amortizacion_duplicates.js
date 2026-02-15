require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'narizon1',
  database: process.env.DB_DATABASE || 'quintas_otinapaV2',
  port: Number(process.env.DB_PORT || 3306),
};

async function main() {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    const [existsSingular] = await conn.execute(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'amortizacion'`,
      [dbConfig.database]
    );
    let tableName = 'amortizacion';
    if (existsSingular.length === 0) {
      const [existsPlural] = await conn.execute(
        `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'amortizaciones'`,
        [dbConfig.database]
      );
      if (existsPlural.length === 0) {
        const [alts] = await conn.execute(
          `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE 'amort%'`,
          [dbConfig.database]
        );
        console.error(
          JSON.stringify({
            error: "No se encontró tabla de amortización",
            database: dbConfig.database,
            alternativas: alts.map((r) => r.TABLE_NAME),
          })
        );
        process.exitCode = 2;
        return;
      }
      tableName = 'amortizaciones';
    }
    const [cols] = await conn.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
      [dbConfig.database, tableName]
    );
    const columnNames = cols.map((c) => c.COLUMN_NAME);
    console.log(JSON.stringify({ tabla: tableName, columnas: columnNames }, null, 2));
    const ventaCol = columnNames.includes('venta_id')
      ? 'venta_id'
      : columnNames.includes('venta')
      ? 'venta'
      : columnNames.includes('suscripcion_id')
      ? 'suscripcion_id'
      : null;
    const numeroCol = columnNames.includes('numero_pago') ? 'numero_pago' : (columnNames.includes('numero') ? 'numero' : null);
    if (!ventaCol || !numeroCol) {
      console.error(JSON.stringify({ error: 'No se encontraron columnas esperadas', ventaCol, numeroCol }));
      process.exitCode = 3;
      return;
    }
    const [dups] = await conn.execute(
      `SELECT ${ventaCol} AS venta_id, ${numeroCol} AS numero_pago, COUNT(*) AS cantidad
       FROM ${tableName}
       GROUP BY ${ventaCol}, ${numeroCol}
       HAVING COUNT(*) > 1`
    );
    if (dups.length === 0) {
      console.log(`Sin duplicados en ${tableName} por (${ventaCol}, ${numeroCol})`);
      return;
    }
    console.log(`Grupos duplicados encontrados en ${tableName}: ${dups.length}`);
    const details = [];
    for (const row of dups) {
      const selectCols = columnNames
        .filter((n) => ['id', ventaCol, numeroCol, 'monto', 'monto_pago', 'fecha', 'fecha_pago', 'estatus'].includes(n))
        .join(', ');
      const [items] = await conn.execute(
        `SELECT ${selectCols}
         FROM ${tableName}
         WHERE ${ventaCol} = ? AND ${numeroCol} = ?
         ORDER BY id`,
        [row.venta_id, row.numero_pago]
      );
      details.push({ clave: ventaCol, venta_id: row.venta_id, numero_pago: row.numero_pago, cantidad: row.cantidad, tabla: tableName, items });
    }
    console.log(JSON.stringify(details, null, 2));
  } catch (e) {
    console.error('Error verificando duplicados:', e.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

main();

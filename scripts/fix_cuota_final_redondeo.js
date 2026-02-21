const mysql = require('mysql2/promise');
require('dotenv').config();

function round2(x) {
  return Math.round((Number(x) + Number.EPSILON) * 100) / 100;
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
  });

  const ventaIdFilter = process.argv[2] || null;
  const filtroVenta = ventaIdFilter ? 'AND v.id = ?' : '';

  const [ventas] = await connection.execute(
    `
    SELECT v.id, v.monto_total, v.enganche, v.tasa_interes, v.metodo_pago
    FROM ventas v
    WHERE v.metodo_pago = 'financiado'
      AND (v.tasa_interes IS NULL OR v.tasa_interes = 0)
      ${filtroVenta}
    `,
    ventaIdFilter ? [ventaIdFilter] : [],
  );

  if (!Array.isArray(ventas) || ventas.length === 0) {
    console.log('No hay ventas financiadas con tasa 0 para procesar.');
    await connection.end();
    return;
  }

  let actualizadas = 0;
  for (const v of ventas) {
    const [rows] = await connection.execute(
      `
      SELECT id, numero_pago, monto_cuota, saldo_inicial
      FROM amortizacion
      WHERE venta_id = ?
      ORDER BY numero_pago ASC
      `,
      [v.id],
    );
    if (!Array.isArray(rows) || rows.length === 0) continue;

    const n = rows.length;
    const prev = rows.slice(0, n - 1);
    const last = rows[n - 1];
    const sumPrev = prev.reduce((acc, r) => acc + Number(r.monto_cuota || 0), 0);
    const objetivo = round2(Number(v.monto_total || 0) - Number(v.enganche || 0));
    const nuevoUltimo = round2(objetivo - round2(sumPrev));

    const delta = round2(nuevoUltimo - Number(last.monto_cuota || 0));
    if (Math.abs(delta) >= 0.01) {
      const saldoInicialUltimo = round2(Number(last.saldo_inicial || 0));
      const capitalUltimo = saldoInicialUltimo; // en tasa 0, capital = saldo inicial
      const cuotaRecalculada = round2(capitalUltimo); // interes 0
      await connection.execute(
        `
        UPDATE amortizacion
        SET monto_cuota = ?, interes = ?, capital = ?, saldo_inicial = ?, saldo_final = ?, updated_at = NOW()
        WHERE id = ?
        `,
        [
          cuotaRecalculada.toFixed(2),
          '0.00',
          capitalUltimo.toFixed(2),
          capitalUltimo.toFixed(2),
          '0.00',
          last.id,
        ],
      );
      actualizadas++;
      console.log(
        `Venta ${v.id}: cuota #${last.numero_pago} ajustada de ${Number(last.monto_cuota).toFixed(
          2,
        )} -> ${cuotaRecalculada.toFixed(2)} (objetivo total=${objetivo.toFixed(2)})`,
      );
    } else {
      // No requiere ajuste
    }
  }

  console.log(`Listo. Ventas actualizadas: ${actualizadas}`);
  await connection.end();
}

main().catch((e) => {
  console.error('Error ejecutando fix_cuota_final_redondeo:', e);
  process.exit(1);
});


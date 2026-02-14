import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export class EstadoCuentaService {
  constructor({ database, services, schema, accountability }) {
    this.database = database;
    this.services = services;
    this.schema = schema;
    this.accountability = accountability;
  }

  async generarEstadoCuenta(ventaId) {
    // 1. Obtener información de la venta, cliente y lote
    const venta = await this.database('ventas')
      .join('clientes', 'ventas.cliente_id', 'clientes.id')
      .join('lotes', 'ventas.lote_id', 'lotes.id')
      .select(
        'ventas.*',
        'clientes.nombre as cliente_nombre',
        'clientes.apellido_paterno',
        'clientes.apellido_materno',
        'lotes.identificador as lote_identificador',
        'lotes.direccion as lote_direccion'
      )
      .where('ventas.id', ventaId)
      .first();

    if (!venta) {
      throw new Error('Venta no encontrada');
    }

    // 2. Obtener resumen financiero
    const resumen = await this.obtenerResumenFinanciero(ventaId, venta);

    // 3. Obtener historial de pagos
    const historialPagos = await this.database('pagos')
      .where({ venta_id: ventaId })
      .orderBy('fecha_pago', 'desc');

    // 4. Obtener tabla de amortización
    const amortizacion = await this.database('amortizacion')
      .where({ venta_id: ventaId })
      .orderBy('numero_pago', 'asc');

    return {
      venta: {
        id: venta.id,
        numero_contrato: venta.id.substring(0, 8).toUpperCase(), // Simulación si no hay campo
        cliente: {
          nombre:
            `${venta.cliente_nombre} ${venta.apellido_paterno} ${venta.apellido_materno || ''}`.trim(),
        },
        propiedad: {
          identificador: venta.lote_identificador,
          direccion: venta.lote_direccion,
        },
        precio_total: parseFloat(venta.monto_total),
        enganche: parseFloat(venta.enganche),
        saldo_inicial: parseFloat(venta.monto_total) - parseFloat(venta.enganche),
      },
      resumen,
      historial_pagos: historialPagos.map((p) => ({
        fecha: p.fecha_pago,
        monto: parseFloat(p.monto),
        metodo: p.metodo_pago, // Asumiendo campo existe o usar notas
        referencia: p.referencia || p.notas,
        tipo: p.concepto || 'Pago',
        estado: p.estatus || 'confirmado',
      })),
      amortizacion: amortizacion.map((c) => ({
        numero_cuota: c.numero_pago,
        fecha_vencimiento: c.fecha_vencimiento,
        cuota: parseFloat(c.monto_cuota),
        interes: parseFloat(c.interes),
        capital: parseFloat(c.capital),
        penalizacion: parseFloat(c.penalizacion_acumulada || 0),
        total_pagado: parseFloat(c.monto_pagado || 0),
        saldo_restante: parseFloat(c.saldo_final),
        estado: c.estatus,
      })),
    };
  }

  async obtenerResumenFinanciero(ventaId, ventaData = null) {
    const pagos = await this.database('pagos').where({ venta_id: ventaId }); // Asumimos pagos confirmados si están en la tabla

    const pagosTotales = pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);

    // Identificar abonos a capital (según lógica de AmortizacionService)
    const abonosCapital = pagos
      .filter(
        (p) =>
          (p.notas || '').toUpperCase().includes('CAPITAL') ||
          (p.concepto || '').toUpperCase().includes('CAPITAL')
      )
      .reduce((sum, p) => sum + parseFloat(p.monto), 0);

    // Nota: penalizaciones tiene amortizacion_id, no venta_id directo.
    // Query correcta:
    const penalizacionesPagadasResult = await this.database('penalizaciones')
      .join('amortizacion', 'penalizaciones.amortizacion_id', 'amortizacion.id')
      .where('amortizacion.venta_id', ventaId)
      .where('penalizaciones.aplicada', true)
      .sum('penalizaciones.monto_penalizacion as total');

    const penalizacionesPagadas = parseFloat(penalizacionesPagadasResult[0].total || 0);

    const penalizacionesPendientesResult = await this.database('amortizacion')
      .where('venta_id', ventaId)
      .sum('penalizacion_acumulada as total');
    const penalizacionesPendientes = parseFloat(penalizacionesPendientesResult[0].total || 0);

    // Saldo actual: Suma de saldos finales de todas las cuotas pendientes?
    // No, saldo_final de la última cuota generada debería ser 0.
    // El saldo insoluto real es la suma de capital pendiente de cuotas no pagadas.
    // O más simple: Saldo Inicial - Capital Pagado.
    // Usamos el saldo_inicial de la primera cuota pendiente, o 0 si todo pagado.
    const primeraPendiente = await this.database('amortizacion')
      .where({ venta_id: ventaId, estatus: 'pendiente' })
      .orderBy('numero_pago', 'asc')
      .first();

    // Si no hay pendientes, saldo es 0 (o revisamos si hay parcial)
    let saldoActual = 0;
    if (primeraPendiente) {
      saldoActual = parseFloat(primeraPendiente.saldo_inicial);
    } else {
      // Revisar si la última pagada tiene saldo final (caso raro)
      const ultima = await this.database('amortizacion')
        .where({ venta_id: ventaId })
        .orderBy('numero_pago', 'desc')
        .first();
      saldoActual = ultima ? parseFloat(ultima.saldo_final) : 0;
    }

    const cuotasAtrasadasCount = await this.database('amortizacion')
      .where({ venta_id: ventaId, estatus: 'pendiente' })
      .where('fecha_vencimiento', '<', new Date())
      .count('id as count');

    return {
      pagos_totales: pagosTotales,
      abonos_capital: abonosCapital,
      penalizaciones_pagadas: penalizacionesPagadas,
      saldo_actual: saldoActual,
      proxima_fecha_pago: primeraPendiente?.fecha_vencimiento || null,
      proxima_cuota: primeraPendiente ? parseFloat(primeraPendiente.monto_cuota) : 0,
      cuotas_atrasadas: parseInt(cuotasAtrasadasCount[0].count),
      penalizaciones_pendientes: penalizacionesPendientes,
    };
  }

  async exportarAPDF(ventaId) {
    const datos = await this.generarEstadoCuenta(ventaId);
    const doc = new jsPDF();

    // Configuración
    const margen = 20;
    let y = 20;

    // Encabezado
    doc.setFontSize(18);
    doc.text('ESTADO DE CUENTA', margen, y);
    doc.setFontSize(10);
    y += 10;
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, margen, y);
    y += 10;

    // Info Cliente
    doc.setFontSize(12);
    doc.text(`Cliente: ${datos.venta.cliente.nombre}`, margen, y);
    y += 6;
    doc.text(`Contrato: ${datos.venta.numero_contrato}`, margen, y);
    y += 6;
    doc.text(`Propiedad: ${datos.venta.propiedad.identificador}`, margen, y);
    y += 15;

    // Resumen Financiero (Tabla simple manual)
    doc.setFontSize(14);
    doc.text('Resumen Financiero', margen, y);
    y += 8;

    const resumenData = [
      ['Precio Total', `$${datos.venta.precio_total.toFixed(2)}`],
      ['Saldo Actual', `$${datos.resumen.saldo_actual.toFixed(2)}`],
      ['Pagos Realizados', `$${datos.resumen.pagos_totales.toFixed(2)}`],
      ['Penalizaciones Pendientes', `$${datos.resumen.penalizaciones_pendientes.toFixed(2)}`],
    ];

    doc.autoTable({
      startY: y,
      head: [['Concepto', 'Monto']],
      body: resumenData,
      theme: 'plain',
      styles: { fontSize: 10 },
    });

    y = doc.lastAutoTable.finalY + 15;

    // Tabla de Amortización Resumida
    doc.setFontSize(14);
    doc.text('Detalle de Pagos (Amortización)', margen, y);
    y += 5;

    const amortizacionRows = datos.amortizacion.map((c) => [
      c.numero_cuota,
      new Date(c.fecha_vencimiento).toLocaleDateString(),
      `$${c.cuota.toFixed(2)}`,
      `$${c.interes.toFixed(2)}`,
      `$${c.capital.toFixed(2)}`,
      `$${c.penalizacion.toFixed(2)}`,
      `$${c.total_pagado.toFixed(2)}`,
      c.estado.toUpperCase(),
    ]);

    doc.autoTable({
      startY: y,
      head: [['#', 'Vencimiento', 'Cuota', 'Interés', 'Capital', 'Mora', 'Pagado', 'Estatus']],
      body: amortizacionRows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 8 },
    });

    return doc.output('arraybuffer'); // Retorna buffer para enviar al cliente
  }
}

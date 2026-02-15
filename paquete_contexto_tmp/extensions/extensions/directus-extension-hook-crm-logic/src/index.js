import { randomUUID } from 'crypto';
import { AmortizacionService } from './services/amortizacion.service.js';
import { PenalizacionesService } from './services/penalizaciones.service.js';

export default ({ filter, action, schedule }, { services, database, getSchema }) => {
  console.log(
    '✅ HOOK CRM-LOGIC LOADED CORRECTLY! (Updated with AmortizacionService & Penalizaciones)'
  );
  const { ItemsService } = services;

  const ServiceUnavailableException = class extends Error {
    constructor(msg) {
      super(msg);
      this.status = 503;
    }
  };
  const ForbiddenException = class extends Error {
    constructor(msg) {
      super(msg);
      this.status = 403;
    }
  };
  const InvalidPayloadException = class extends Error {
    constructor(msg) {
      super(msg);
      this.status = 400;
    }
  };

  // =================================================================================
  // 1. HOOK: lotes.items.create
  // =================================================================================
  filter('lotes.items.create', async (payload) => {
    if (!payload.estatus) payload.estatus = 'disponible';
    const validStatuses = ['disponible', 'apartado', 'vendido', 'liquidado', 'bloqueado'];
    if (!validStatuses.includes(payload.estatus)) payload.estatus = 'disponible';
    return payload;
  });

  // =================================================================================
  // 2. HOOK: ventas.items.create (FILTER)
  // =================================================================================
  filter('ventas.items.create', async (payload) => {
    if (!payload.lote_id) throw new InvalidPayloadException('El campo "lote_id" es obligatorio.');

    try {
      const result = await database
        .select('estatus')
        .from('lotes')
        .where('id', payload.lote_id)
        .first();
      if (!result)
        throw new InvalidPayloadException(`El lote con ID ${payload.lote_id} no existe.`);
      if (result.estatus !== 'disponible') {
        throw new ForbiddenException(`El lote no está disponible (Estatus: ${result.estatus}).`);
      }
    } catch (err) {
      if (err instanceof ForbiddenException || err instanceof InvalidPayloadException) throw err;
      throw new ServiceUnavailableException(err.message);
    }
    return payload;
  });

  // =================================================================================
  // 3. HOOK: ventas.items.create (ACTION)
  // =================================================================================
  action('ventas.items.create', async (meta, { schema, accountability }) => {
    const ventaId = meta.key;
    const context = { schema, accountability: { admin: true } }; // Admin access for automation
    const ventasService = new ItemsService('ventas', context);
    const lotesService = new ItemsService('lotes', context);

    const amortizacionService = new AmortizacionService({
      database,
      services,
      schema,
      accountability: context.accountability,
    });

    try {
      const venta = await ventasService.readOne(ventaId);
      console.log(`[Hook] Procesando nueva venta: ${ventaId}`);

      // A. Actualizar Estatus de Lote
      if (venta.lote_id) {
        await lotesService.updateOne(venta.lote_id, {
          estatus: 'apartado',
          cliente_id: venta.cliente_id,
          vendedor_id: venta.vendedor_id,
        });
      }

      // B. Generar Tabla de Amortización
      if (venta.metodo_pago === 'financiado') {
        await amortizacionService.generarTabla(venta);
      }

      // C. Generar Comisiones
      await generarComisiones(venta, services, schema);
    } catch (error) {
      console.error(`❌ Error en post-procesamiento de venta ${ventaId}:`, error);
    }
  });

  // =================================================================================
  // 4. HOOK: pagos.items.create (ACTION)
  // =================================================================================
  action('pagos.items.create', async (meta, { schema, accountability }) => {
    const pagoId = meta.key;
    const context = { schema, accountability: accountability || { admin: true } };
    const pagosService = new ItemsService('pagos', context);
    const ventasService = new ItemsService('ventas', context);
    const lotesService = new ItemsService('lotes', context);

    const amortizacionService = new AmortizacionService({
      database,
      services,
      schema,
      accountability: context.accountability,
    });

    try {
      const pago = await pagosService.readOne(pagoId);
      if (!pago.venta_id) return;

      console.log(`[Hook] Procesando pago ${pagoId} para venta ${pago.venta_id}`);

      // A. Registrar Pago en Tabla de Amortización
      // Esto actualiza estatus de cuotas, maneja capital, etc.
      await amortizacionService.registrarPago(pago);

      // B. Verificar si la venta se ha liquidado totalmente
      // Consultamos amortizacion para ver si queda algo pendiente
      const pendientes = await database('amortizacion')
        .where({ venta_id: pago.venta_id })
        .whereIn('estatus', ['pendiente', 'parcial'])
        .count('id as count')
        .first();

      const numPendientes = parseInt(pendientes?.count || 0);

      if (numPendientes === 0) {
        // Verificar saldo real (por si acaso quedó centavos)
        const saldoTotal = await database('amortizacion')
          .where({ venta_id: pago.venta_id })
          .sum('saldo_final as total')
          .first();

        const deudaRestante = parseFloat(saldoTotal?.total || 0);

        if (deudaRestante < 1.0) {
          // Tolerancia de 1 peso
          const venta = await ventasService.readOne(pago.venta_id);
          if (venta.estatus !== 'pagada') {
            await ventasService.updateOne(pago.venta_id, { estatus: 'pagada' });
            console.log(`🎉 Venta ${pago.venta_id} LIQUIDADA completada!`);

            if (venta.lote_id) {
              await lotesService.updateOne(venta.lote_id, { estatus: 'vendido' }); // O 'liquidado'
            }
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error procesando pago ${pagoId}:`, error);
    }
  });

  // =================================================================================
  // 5. CRON JOB: Calcular Penalizaciones Diarias
  // =================================================================================
  schedule('0 0 * * *', async () => {
    console.log('⏰ [CRON] Ejecutando cálculo de penalizaciones...');
    const schema = await getSchema(); // Ensure schema is available
    const context = { schema, accountability: { admin: true } };
    const penalizacionesService = new PenalizacionesService({
      database,
      services,
      schema: context.schema,
      accountability: context.accountability,
    });

    try {
      await penalizacionesService.calcularPenalizacionesVencidas();
    } catch (error) {
      console.error('❌ [CRON] Error calculando penalizaciones:', error);
    }
  });
};

// --- Funciones Auxiliares ---

async function generarComisiones(venta, services, schema) {
  const { ItemsService } = services;
  const comisionesService = new ItemsService('comisiones', { schema });
  const vendedoresService = new ItemsService('vendedores', { schema });

  let commissionRate = 5.0; // Default

  try {
    const vendedor = await vendedoresService.readOne(venta.vendedor_id);
    if (vendedor && vendedor.comision_porcentaje) {
      commissionRate = parseFloat(vendedor.comision_porcentaje);
    }
  } catch (e) {
    console.warn('⚠️ No se pudo obtener comisión del vendedor, usando default 5%');
  }

  const totalCommission = parseFloat(venta.monto_total) * (commissionRate / 100);

  const milestones = [
    { name: 'Enganche', pct: 0.3, condition: 'Al pagar enganche' },
    { name: 'Contrato', pct: 0.3, condition: 'Al firmar contrato' },
    { name: 'Liquidación', pct: 0.4, condition: 'Al liquidar venta' },
  ];

  const comisiones = milestones.map((m) => {
    const effectiveRate = commissionRate * m.pct;
    const amount = parseFloat(venta.monto_total) * (effectiveRate / 100);

    return {
      id: randomUUID(),
      venta_id: venta.id,
      vendedor_id: venta.vendedor_id,
      tipo_comision: `Comisión ${m.name}`,
      monto_venta: parseFloat(venta.monto_total),
      porcentaje_comision: effectiveRate.toFixed(2),
      monto_comision: amount.toFixed(2),
      estatus: 'pendiente',
      fecha_pago_programada: new Date().toISOString().split('T')[0],
      notas: `Generado automáticamente. Concepto: ${m.name} (${(m.pct * 100).toFixed(0)}% del total)`,
    };
  });

  await comisionesService.createMany(comisiones);
  console.log(`💰 ${comisiones.length} comisiones generadas para Vendedor ${venta.vendedor_id}`);
}

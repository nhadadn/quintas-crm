import { randomUUID } from 'crypto';
import { AmortizacionService } from './services/amortizacion.service.js';
import { PenalizacionesService } from './services/penalizaciones.service.js';

export default ({ filter, action, schedule }, { services, database, getSchema }) => {
  console.log(
    '✅ HOOK CRM-LOGIC LOADED CORRECTLY! (Updated with AmortizacionService & Penalizaciones)'
  );
  const { ItemsService } = services;
  // Aplicar correcciones de esquema/permiso críticas al cargar (idempotentes)
  (async () => {
    try {
      // 027: ventas.post_process_status y post_process_error + índice
      const cols = await database
        .select('COLUMN_NAME as name')
        .from('information_schema.columns')
        .where('table_schema', database.client.config.connection.database)
        .andWhere('table_name', 'ventas');
      const names = (cols || []).map((r) => String(r.name).toLowerCase());
      if (!names.includes('post_process_status')) {
        await database.raw(
          "ALTER TABLE `ventas` ADD COLUMN `post_process_status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending, ok, error' AFTER `metodo_pago`"
        );
        console.log('🛠️ Agregado ventas.post_process_status');
      }
      if (!names.includes('post_process_error')) {
        await database.raw(
          'ALTER TABLE `ventas` ADD COLUMN `post_process_error` TEXT NULL AFTER `post_process_status`'
        );
        console.log('🛠️ Agregado ventas.post_process_error');
      }
      // índice
      const idx = await database
        .select('INDEX_NAME as name')
        .from('information_schema.statistics')
        .where('table_schema', database.client.config.connection.database)
        .andWhere('table_name', 'ventas')
        .andWhere('index_name', 'idx_post_process_status');
      if (!idx || idx.length === 0) {
        await database.raw('CREATE INDEX `idx_post_process_status` ON `ventas` (`post_process_status`)');
        console.log('🛠️ Creado índice idx_post_process_status');
      }
    } catch (e) {
      console.warn('⚠️ Error aplicando 027 a nivel código:', e?.message || e);
    }
    try {
      // 028: permisos Vendedor Policy
      const POLICY = '140c8369-074c-4712-984e-72089301294d';
      // Ventas READ (vendedor_id.user_id = CURRENT_USER)
      const ventasRead = await database('directus_permissions')
        .where({ policy: POLICY, collection: 'ventas', action: 'read' })
        .first();
      const ventasPerm = JSON.stringify({ vendedor_id: { user_id: { _eq: '$CURRENT_USER' } } });
      if (ventasRead) {
        if (ventasRead.permissions !== ventasPerm) {
          await database('directus_permissions')
            .where({ policy: POLICY, collection: 'ventas', action: 'read' })
            .update({ permissions: ventasPerm });
          console.log('🛠️ Actualizada regla ventas.read para Vendedor Policy');
        }
      } else {
        await database('directus_permissions').insert({
          policy: POLICY,
          collection: 'ventas',
          action: 'read',
          permissions: ventasPerm,
          fields: '*',
        });
        console.log('🛠️ Insertada regla ventas.read para Vendedor Policy');
      }
      // Amortizacion READ
      const amortRead = await database('directus_permissions')
        .where({ policy: POLICY, collection: 'amortizacion', action: 'read' })
        .first();
      const amortPerm = JSON.stringify({
        venta_id: { vendedor_id: { user_id: { _eq: '$CURRENT_USER' } } },
      });
      if (!amortRead) {
        await database('directus_permissions').insert({
          policy: POLICY,
          collection: 'amortizacion',
          action: 'read',
          permissions: amortPerm,
          fields: '*',
        });
        console.log('🛠️ Insertada regla amortizacion.read para Vendedor Policy');
      }
      // pagos_movimientos READ & CREATE
      const pagosRead = await database('directus_permissions')
        .where({ policy: POLICY, collection: 'pagos_movimientos', action: 'read' })
        .first();
      const pagosCreate = await database('directus_permissions')
        .where({ policy: POLICY, collection: 'pagos_movimientos', action: 'create' })
        .first();
      const pagosPerm = JSON.stringify({
        venta_id: { vendedor_id: { user_id: { _eq: '$CURRENT_USER' } } },
      });
      if (!pagosRead) {
        await database('directus_permissions').insert({
          policy: POLICY,
          collection: 'pagos_movimientos',
          action: 'read',
          permissions: pagosPerm,
          fields: '*',
        });
        console.log('🛠️ Insertada regla pagos_movimientos.read');
      }
      if (!pagosCreate) {
        await database('directus_permissions').insert({
          policy: POLICY,
          collection: 'pagos_movimientos',
          action: 'create',
          permissions: pagosPerm,
          fields: '*',
        });
        console.log('🛠️ Insertada regla pagos_movimientos.create');
      }
      // Lotes UPDATE básico (estatus != vendido)
      const lotesUpdate = await database('directus_permissions')
        .where({ policy: POLICY, collection: 'lotes', action: 'update' })
        .first();
      if (!lotesUpdate) {
        await database('directus_permissions').insert({
          policy: POLICY,
          collection: 'lotes',
          action: 'update',
          permissions: JSON.stringify({ estatus: { _neq: 'vendido' } }),
          fields: 'estatus,cliente_id,vendedor_id',
        });
        console.log('🛠️ Insertada regla lotes.update');
      }
      // 029: ajustes adicionales para clientes/vendedores/lotes
      // clientes read
      const clientesRead = await database('directus_permissions')
        .where({ policy: POLICY, collection: 'clientes', action: 'read' })
        .first();
      if (clientesRead) {
        if (clientesRead.permissions !== null || clientesRead.fields !== '*') {
          await database('directus_permissions')
            .where({ policy: POLICY, collection: 'clientes', action: 'read' })
            .update({ permissions: null, fields: '*' });
          console.log('🛠️ Actualizada regla clientes.read');
        }
      } else {
        await database('directus_permissions').insert({
          policy: POLICY,
          collection: 'clientes',
          action: 'read',
          permissions: null,
          fields: '*',
        });
        console.log('🛠️ Insertada regla clientes.read');
      }
      // clientes create
      const clientesCreate = await database('directus_permissions')
        .where({ policy: POLICY, collection: 'clientes', action: 'create' })
        .first();
      if (!clientesCreate) {
        await database('directus_permissions').insert({
          policy: POLICY,
          collection: 'clientes',
          action: 'create',
          permissions: null,
          fields: '*',
        });
        console.log('🛠️ Insertada regla clientes.create');
      }
      // vendedores read
      const vendedoresRead = await database('directus_permissions')
        .where({ policy: POLICY, collection: 'vendedores', action: 'read' })
        .first();
      if (!vendedoresRead) {
        await database('directus_permissions').insert({
          policy: POLICY,
          collection: 'vendedores',
          action: 'read',
          permissions: null,
          fields: '*',
        });
        console.log('🛠️ Insertada regla vendedores.read');
      }
      // lotes read global
      const lotesRead = await database('directus_permissions')
        .where({ policy: POLICY, collection: 'lotes', action: 'read' })
        .first();
      if (lotesRead) {
        if (lotesRead.permissions !== null || lotesRead.fields !== '*') {
          await database('directus_permissions')
            .where({ policy: POLICY, collection: 'lotes', action: 'read' })
            .update({ permissions: null, fields: '*' });
          console.log('🛠️ Actualizada regla lotes.read');
        }
      } else {
        await database('directus_permissions').insert({
          policy: POLICY,
          collection: 'lotes',
          action: 'read',
          permissions: null,
          fields: '*',
        });
        console.log('🛠️ Insertada regla lotes.read');
      }
    } catch (e) {
      console.warn('⚠️ Error aplicando 028 a nivel código:', e?.message || e);
    }
  })();

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
      // Marcar inicio de post-proceso
      try {
        await ventasService.updateOne(ventaId, { post_process_status: 'pending', post_process_error: null });
      } catch (e) {
        console.warn(`⚠️ No se pudo marcar post_process_status=pending para venta ${ventaId}:`, e?.message || e);
      }
      const venta = await ventasService.readOne(ventaId);
      console.log(`[Hook] Procesando nueva venta: ${ventaId}`);

      // A0. Resolver vendedor_id si viene vacío, mapeando user_created -> vendedores.user_id
      try {
        if (!venta.vendedor_id) {
          const metaVenta = await database.select('user_created').from('ventas').where('id', ventaId).first();
          const creador = metaVenta?.user_created;
          if (creador) {
            const vendedorRow = await database.select('id').from('vendedores').where('user_id', creador).first();
            if (vendedorRow?.id) {
              await ventasService.updateOne(ventaId, { vendedor_id: vendedorRow.id });
              venta.vendedor_id = vendedorRow.id;
              console.log(`[Hook] vendedor_id asignado automáticamente desde user_created → ${vendedorRow.id}`);
            }
          }
        }
      } catch (e) {
        console.warn(`⚠️ No se pudo resolver vendedor_id desde user_created para venta ${ventaId}:`, e?.message || e);
      }

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
      await generarComisiones(venta, services, schema, database);
      // Marcar éxito
      try {
        await ventasService.updateOne(ventaId, { post_process_status: 'ok', post_process_error: null });
      } catch (e) {
        console.warn(`⚠️ No se pudo marcar post_process_status=ok para venta ${ventaId}:`, e?.message || e);
      }
    } catch (error) {
      console.error(`❌ Error en post-procesamiento de venta ${ventaId}:`, error);
      try {
        await ventasService.updateOne(ventaId, {
          post_process_status: 'error',
          post_process_error: String(error?.message || error),
        });
      } catch (e) {
        console.error(`❌ Además falló actualizar estado de post-proceso para venta ${ventaId}:`, e);
      }
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

  action('pagos_movimientos.items.create', async (meta) => {
    if (!globalThis.__movsProcessed) globalThis.__movsProcessed = new Set();
    try {
      const movId = meta.key;
      if (globalThis.__movsProcessed.has(movId)) {
        console.log(`[pagos_movimientos.create] Skip duplicate ${movId}`);
        return;
      }
      const movimiento = await database('pagos_movimientos').where({ id: movId }).first();
      if (!movimiento) return;
      const ventaId = movimiento.venta_id;
      const numeroPago = movimiento.numero_pago;
      const monto = parseFloat(movimiento.monto || 0);
      const notas = movimiento.notas || '';
      if (!ventaId || !numeroPago || monto <= 0) return;
      if (typeof notas === 'string' && notas.includes('[APLICACION_AUTOMATICA]')) {
        globalThis.__movsProcessed.add(movId);
        return;
      }
      console.log(`[pagos_movimientos.create] Apply ${movId} venta=${ventaId} cuota=${numeroPago} monto=${monto}`);
      const cuota = await database('amortizacion').where({ venta_id: ventaId, numero_pago: numeroPago }).first();
      if (!cuota) {
        globalThis.__movsProcessed.add(movId);
        return;
      }
      const montoCuota = parseFloat(cuota.monto_cuota || 0);
      const pagadoPrev = parseFloat(cuota.monto_pagado || 0);
      const nuevoPagado = pagadoPrev + monto;
      const nuevoEstatus = nuevoPagado >= (montoCuota - 0.01) ? 'pagado' : 'parcial';
      await database('amortizacion').where({ id: cuota.id }).update({
        monto_pagado: nuevoPagado,
        estatus: nuevoEstatus,
        updated_at: new Date(),
      });
      globalThis.__movsProcessed.add(movId);
    } catch (e) {
      console.error('❌ Error en hook pagos_movimientos.items.create:', e);
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

async function generarComisiones(venta, services, schema, database) {
  const { ItemsService } = services;
  const comisionesService = new ItemsService('comisiones', { schema });
  const vendedoresService = new ItemsService('vendedores', { schema });

  let commissionRate = 5.0; // Default
  let esquema = 'porcentaje';
  let comisionFija = 0.0;

  try {
    const vendedor = await vendedoresService.readOne(venta.vendedor_id);
    if (vendedor && vendedor.comision_porcentaje) {
      commissionRate = parseFloat(vendedor.comision_porcentaje);
    }
    if (vendedor && vendedor.comision_esquema) {
      esquema = String(vendedor.comision_esquema).toLowerCase();
    }
    if (vendedor && vendedor.comision_fija != null) {
      comisionFija = parseFloat(vendedor.comision_fija);
    }
  } catch (e) {
    console.warn('⚠️ No se pudo obtener comisión del vendedor, usando default 5%');
  }

  const milestones = [
    { name: 'Enganche', pct: 0.3, condition: 'Al pagar enganche' },
    { name: 'Contrato', pct: 0.3, condition: 'Al firmar contrato' },
    { name: 'Liquidación', pct: 0.4, condition: 'Al liquidar venta' },
  ];

  // Detectar columnas reales de comisiones para alinear escritura
  async function detectComisionesColumns(db) {
    try {
      if (db?.raw) {
        const res = await db.raw('SHOW COLUMNS FROM `comisiones`');
        const rows = Array.isArray(res) ? (Array.isArray(res[0]) ? res[0] : res) : res?.[0] || [];
        const names = rows.map((r) => (r.Field || r.COLUMN_NAME || '').toLowerCase());
        return { hasPorcentaje: names.includes('porcentaje'), hasPorcentajeComision: names.includes('porcentaje_comision') };
      }
    } catch (e) {
      console.warn('detectComisionesColumns (hook) falló, usando defaults:', e?.message || e);
    }
    return { hasPorcentaje: false, hasPorcentajeComision: true };
  }
  const cols = await detectComisionesColumns(database);

  const comisiones = [];
  const montoVenta = parseFloat(venta.monto_total);

  if (esquema === 'fijo') {
    const base = {
      id: randomUUID(),
      venta_id: venta.id,
      vendedor_id: venta.vendedor_id,
      tipo_comision: 'Comisión Fija',
      monto_venta: montoVenta,
      monto_comision: parseFloat(comisionFija.toFixed(2)),
      estatus: 'pendiente',
      fecha_pago_programada: new Date().toISOString().split('T')[0],
      notas: 'Generado automáticamente (esquema fijo)',
    };
    if (cols.hasPorcentajeComision) base.porcentaje_comision = 0.0;
    if (cols.hasPorcentaje) base.porcentaje = 0.0;
    comisiones.push(base);
  } else {
    for (const m of milestones) {
      const effectiveRate = commissionRate * m.pct; // p.ej 5% * 0.3 = 1.5%
      const amount = montoVenta * (effectiveRate / 100);
      const base = {
        id: randomUUID(),
        venta_id: venta.id,
        vendedor_id: venta.vendedor_id,
        tipo_comision: `Comisión ${m.name}`,
        monto_venta: montoVenta,
        monto_comision: parseFloat(amount.toFixed(2)),
        estatus: 'pendiente',
        fecha_pago_programada: new Date().toISOString().split('T')[0],
        notas: `Generado automáticamente. Concepto: ${ (m.pct * 100).toFixed(0) }% del total`,
      };
      const pr = parseFloat(effectiveRate.toFixed(2));
      if (cols.hasPorcentajeComision) base.porcentaje_comision = pr;
      if (cols.hasPorcentaje) base.porcentaje = pr;
      comisiones.push(base);
    }
    if (esquema === 'mixto' && comisionFija > 0) {
      const baseFija = {
        id: randomUUID(),
        venta_id: venta.id,
        vendedor_id: venta.vendedor_id,
        tipo_comision: 'Comisión Fija',
        monto_venta: montoVenta,
        monto_comision: parseFloat(comisionFija.toFixed(2)),
        estatus: 'pendiente',
        fecha_pago_programada: new Date().toISOString().split('T')[0],
        notas: 'Generado automáticamente (esquema mixto)',
      };
      if (cols.hasPorcentajeComision) baseFija.porcentaje_comision = 0.0;
      if (cols.hasPorcentaje) baseFija.porcentaje = 0.0;
      comisiones.push(baseFija);
    }
  }

  if (comisiones.length === 0) {
    throw new Error(`No se pudieron determinar comisiones para venta ${venta.id}`);
  }

  await comisionesService.createMany(comisiones);
  console.log(`💰 ${comisiones.length} comisiones generadas para Vendedor ${venta.vendedor_id}`);
}

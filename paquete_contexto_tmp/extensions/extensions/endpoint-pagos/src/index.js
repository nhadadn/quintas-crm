import { createPaymentIntent, createOrRetrieveCustomer } from './stripe-service.js';
import { z } from 'zod';
import {
  createSubscriptionSchema,
  changePlanSchema,
  refundSchema,
  reportSchema,
  createPaymentIntentSchema,
  rejectRefundSchema,
  registerPaymentSchema,
} from './validators.js';
import { StripeSubscriptionsService } from './stripe-subscriptions.service.js';
import { RefundService } from './refund-service.js';
import { WebhookService } from './webhook-service.js';
import { ReportsService } from './reports-service.js';

class ForbiddenException extends Error {
  constructor(msg) {
    super(msg);
    this.status = 403;
  }
}
class InvalidPayloadException extends Error {
  constructor(msg) {
    super(msg);
    this.status = 400;
  }
}
class NotFoundException extends Error {
  constructor(msg) {
    super(msg);
    this.status = 404;
  }
}

import { EstadoCuentaService } from './estado-cuenta.service.js';

export default (router, { services, database, getSchema }) => {
  const { ItemsService } = services;

  console.log('✅ Endpoint /pagos registrado correctamente');

  const getServices = async (req) => {
    const accountability = req.accountability;
    const schema = await getSchema();
    const getSchemaFn = async () => schema;

    return {
      subscriptionService: new StripeSubscriptionsService({
        services,
        database,
        accountability,
        getSchema: getSchemaFn,
      }),
      refundService: new RefundService({
        services,
        database,
        accountability,
        getSchema: getSchemaFn,
      }),
      webhookService: new WebhookService({ services, database, getSchema: getSchemaFn }),
      reportsService: new ReportsService({ services, database, getSchema: getSchemaFn }),
      estadoCuentaService: new EstadoCuentaService({ services, database, accountability, schema }),
      itemsService: ItemsService,
    };
  };

  const rateLimitMap = new Map();
  const RATE_LIMIT_WINDOW = 60 * 1000;
  const MAX_REQUESTS = 100;

  const rateLimiter = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    if (!rateLimitMap.has(ip)) rateLimitMap.set(ip, []);
    const timestamps = rateLimitMap.get(ip);
    const validTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW);
    if (validTimestamps.length >= MAX_REQUESTS) {
      console.warn(`⚠️ Global Rate limit exceeded for IP ${ip}`);
      return res
        .status(429)
        .json({ errors: [{ message: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' }] });
    }
    validTimestamps.push(now);
    rateLimitMap.set(ip, validTimestamps);
    next();
  };
  router.use(rateLimiter);

  router.get('/health', (req, res) => {
    res.json({ ok: true, service: 'pagos' });
  });

  function handleError(err, res) {
    process.stdout.write(`DEBUG ERROR: ${err.message}\n${err.stack}\n`);
    console.error(err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.errors || err.issues });
    }
    if (err.status) {
      return res.status(err.status).json({ errors: [{ message: err.message }] });
    }
    res.status(500).json({ errors: [{ message: err.message }] });
  }

  // =================================================================================
  // NEW ROUTES (Must come before generic /:id)
  // =================================================================================

  // Estado de Cuenta
  router.get('/estado-cuenta/:venta_id', async (req, res) => {
    try {
      const { estadoCuentaService } = await getServices(req);
      const data = await estadoCuentaService.generarEstadoCuenta(req.params.venta_id);
      res.json(data);
    } catch (error) {
      handleError(error, res);
    }
  });

  router.get('/estado-cuenta/:venta_id/pdf', async (req, res) => {
    try {
      const { estadoCuentaService } = await getServices(req);
      const pdfBuffer = await estadoCuentaService.exportarAPDF(req.params.venta_id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=estado_cuenta_${req.params.venta_id}.pdf`
      );
      res.send(Buffer.from(pdfBuffer));
    } catch (error) {
      handleError(error, res);
    }
  });

  // Pagos (Amortización)
  router.post('/create-payment-intent', async (req, res) => {
    try {
      const body = createPaymentIntentSchema.parse(req.body);
      const { itemsService, subscriptionService } = await getServices(req); // reuse services logic
      const schema = await getSchema();

      const pagosService = new itemsService('pagos', {
        schema,
        accountability: req.accountability,
      });
      const clientesService = new itemsService('clientes', {
        schema,
        accountability: req.accountability,
      });

      // 1. Buscar el pago
      let query = {
        filter: { _and: [] },
        fields: ['*', 'venta_id.*'],
        limit: 1,
      };

      if (body.pago_id) {
        query.filter._and.push({ id: { _eq: body.pago_id } });
      } else {
        query.filter._and.push({
          venta_id: { _eq: body.venta_id },
          numero_pago: { _eq: body.numero_pago },
        });
      }

      const pagos = await pagosService.readByQuery(query);
      if (pagos.length === 0) throw new NotFoundException('Pago no encontrado');

      const pago = pagos[0];

      // 2. Validar propiedad (RLS simplificado)
      // Asumimos que venta_id es un objeto populado, si no, habría que buscarlo.
      // Directus fields=['venta_id.*'] debería traerlo.
      const clienteIdReal = pago.venta_id?.cliente_id || pago.cliente_id; // Ajustar según modelo de datos real

      // En el test se espera validación contra body.cliente_id
      if (String(clienteIdReal) !== String(body.cliente_id)) {
        throw new ForbiddenException('No tienes permiso para pagar este recibo');
      }

      // 3. Validar estatus
      if (pago.estatus === 'pagado') {
        return res.status(409).json({ errors: [{ message: 'Este pago ya fue realizado' }] });
      }

      // Debug log for test
      console.log('Checking monto:', pago.monto, typeof pago.monto);

      if (pago.monto <= 0) {
        throw new InvalidPayloadException('El monto a pagar debe ser mayor a 0');
      }

      // 4. Buscar/Crear Cliente Stripe
      // Necesitamos datos del cliente.
      const cliente = await clientesService.readOne(clienteIdReal);
      if (!cliente) {
        throw new NotFoundException('Cliente no encontrado');
      }

      const stripeCustomer = await createOrRetrieveCustomer({
        id: cliente.id,
        email: cliente.email,
        nombre: cliente.nombre,
      });

      // 5. Crear PaymentIntent
      const paymentIntent = await createPaymentIntent(
        pago.monto,
        'mxn',
        {
          pago_id: pago.id,
          venta_id: typeof pago.venta_id === 'object' ? pago.venta_id.id : pago.venta_id,
          numero_pago: pago.numero_pago,
        },
        stripeCustomer.id
      );

      // 6. Actualizar pago con referencias de Stripe
      await pagosService.updateOne(pago.id, {
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: stripeCustomer.id,
      });

      // 7. Actualizar cliente con stripe_customer_id si es nuevo o cambió
      if (cliente.stripe_customer_id !== stripeCustomer.id) {
        await clientesService.updateOne(cliente.id, {
          stripe_customer_id: stripeCustomer.id,
        });
      }

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (e) {
      if (e.status === 409) return res.status(409).json({ errors: [{ message: e.message }] }); // Manejo manual para 409
      handleError(e, res);
    }
  });

  // Suscripciones
  router.get('/suscripciones', async (req, res) => {
    try {
      const { cliente_id } = req.query;
      if (!cliente_id) throw new InvalidPayloadException('cliente_id es requerido');
      const { subscriptionService } = await getServices(req);
      const result = await subscriptionService.listSubscriptions(cliente_id);
      res.json({ data: result });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.get('/suscripciones/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { subscriptionService } = await getServices(req);
      const result = await subscriptionService.retrieveSubscription(id);
      res.json({ data: result });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.post('/suscripciones/crear', async (req, res) => {
    try {
      const body = createSubscriptionSchema.parse(req.body);
      const { subscriptionService } = await getServices(req);
      const result = await subscriptionService.create(body);
      res.json({ data: result });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.put('/suscripciones/:id/cambiar-plan', async (req, res) => {
    try {
      const { id } = req.params;
      const body = changePlanSchema.parse(req.body);
      const { subscriptionService } = await getServices(req);
      const result = await subscriptionService.changePlan(id, body.plan_id);
      res.json({ data: result });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.post('/suscripciones/:id/cancelar', async (req, res) => {
    try {
      const { id } = req.params;
      const { subscriptionService } = await getServices(req);
      const result = await subscriptionService.cancel(id);
      res.json({ data: result });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.post('/suscripciones/:id/pausar', async (req, res) => {
    try {
      const { id } = req.params;
      const { subscriptionService } = await getServices(req);
      const result = await subscriptionService.pause(id);
      res.json({ data: result });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.post('/suscripciones/:id/reanudar', async (req, res) => {
    try {
      const { id } = req.params;
      const { subscriptionService } = await getServices(req);
      const result = await subscriptionService.resume(id);
      res.json({ data: result });
    } catch (e) {
      handleError(e, res);
    }
  });

  // Reembolsos
  router.post('/reembolsos/solicitar', async (req, res) => {
    try {
      const body = refundSchema.parse(req.body);
      if (req.accountability?.user) body.solicitado_por = req.accountability.user;
      const { refundService } = await getServices(req);
      const result = await refundService.requestRefund(body);
      res.json({ data: result });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.post('/reembolsos/:id/aprobar', async (req, res) => {
    try {
      const { id } = req.params;
      const { refundService } = await getServices(req);
      const result = await refundService.approveRefund(id, req.accountability?.user);
      res.json({ data: result });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.post('/reembolsos/:id/rechazar', async (req, res) => {
    try {
      const { id } = req.params;
      const body = rejectRefundSchema.parse(req.body);
      const { refundService } = await getServices(req);
      const result = await refundService.rejectRefund(id, req.accountability?.user, body.motivo);
      res.json({ data: result });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.get('/reembolsos', async (req, res) => {
    try {
      const { status, user_id } = req.query;
      const { refundService } = await getServices(req);
      const result = await refundService.listRefunds(user_id, status);
      res.json({ data: result });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.get('/reembolsos/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { refundService } = await getServices(req);
      const result = await refundService.retrieveRefund(id);
      res.json({ data: result });
    } catch (e) {
      handleError(e, res);
    }
  });

  // Webhooks
  router.post('/webhooks/stripe', async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      const { webhookService } = await getServices(req);
      await webhookService.handleEvent(req.rawBody || req.body, sig);
      res.json({ received: true });
    } catch (e) {
      console.error('Webhook Error', e);
      if (e.message.includes('signature') || e.message.includes('No signatures found')) {
        return res.status(400).send(`Webhook Error: ${e.message}`);
      }
      res.status(500).send(`Webhook Error: ${e.message}`);
    }
  });

  // Reportes
  router.get('/reportes/ingresos', async (req, res) => {
    try {
      const query = reportSchema.parse(req.query);
      const { reportsService } = await getServices(req);
      const report = await reportsService.generateIncomeReport(query);

      if (query.formato === 'excel') {
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', 'attachment; filename=reporte.xlsx');
        res.send(report);
      } else if (query.formato === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte.pdf');
        res.send(report);
      } else {
        res.json({ data: report });
      }
    } catch (e) {
      handleError(e, res);
    }
  });

  router.get('/reportes/ventas', async (req, res) => {
    try {
      const query = reportSchema.parse(req.query);
      const { vendedor_id, propiedad_id, estado } = req.query;
      const { reportsService } = await getServices(req);
      const report = await reportsService.getSalesReport({
        ...query,
        vendedor_id,
        propiedad_id,
        estado,
      });
      res.json({ data: report });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.get('/reportes/clientes', async (req, res) => {
    try {
      const query = reportSchema.parse(req.query);
      const { reportsService } = await getServices(req);
      const report = await reportsService.getClientReport(query);
      res.json({ data: report });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.get('/reportes/comisiones', async (req, res) => {
    try {
      const query = reportSchema.parse(req.query);
      const { vendedor_id } = req.query;
      const { reportsService } = await getServices(req);
      const report = await reportsService.getCommissionReport({ ...query, vendedor_id });
      res.json({ data: report });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.get('/reportes/pagos', async (req, res) => {
    try {
      const query = reportSchema.parse(req.query);
      const { vendedor_id, metodo_pago, estatus } = req.query;
      const { reportsService } = await getServices(req);
      const report = await reportsService.getPaymentsReport({
        ...query,
        vendedor_id,
        metodo_pago,
        estatus,
      });
      res.json({ data: report });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.get('/reportes/kpis', async (req, res) => {
    try {
      const query = reportSchema.parse(req.query);
      const { reportsService } = await getServices(req);
      const kpis = await reportsService.getKPIsReport(query);
      res.json({ data: kpis });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.get('/reportes/suscripciones', async (req, res) => {
    try {
      const query = reportSchema.parse(req.query);
      const { reportsService } = await getServices(req);
      const metrics = await reportsService.getSubscriptionMetrics(
        query.fecha_inicio,
        query.fecha_fin
      );
      res.json({ data: metrics });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.get('/reportes/ingresos-por-plan', async (req, res) => {
    try {
      const query = reportSchema.parse(req.query);
      const { reportsService } = await getServices(req);
      const revenue = await reportsService.getRevenueByPlan(query.fecha_inicio, query.fecha_fin);
      res.json({ data: revenue });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.get('/reportes/churn-rate', async (req, res) => {
    try {
      const query = reportSchema.parse(req.query);
      const { reportsService } = await getServices(req);
      const churn = await reportsService.getChurnRate(query.fecha_inicio, query.fecha_fin);
      res.json({ data: churn });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.get('/reportes/mrr', async (req, res) => {
    try {
      const { reportsService } = await getServices(req);
      const mrr = await reportsService.getMRR();
      res.json({ data: mrr });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.get('/reportes/arpu', async (req, res) => {
    try {
      const { reportsService } = await getServices(req);
      const arpu = await reportsService.getARPU();
      res.json({ data: arpu });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.get('/reportes/reembolsos', async (req, res) => {
    try {
      const query = reportSchema.parse(req.query);
      const { reportsService } = await getServices(req);
      const metrics = await reportsService.getRefundMetrics(query.fecha_inicio, query.fecha_fin);
      res.json({ data: metrics });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.get('/reportes/dashboard', async (req, res) => {
    try {
      const query = reportSchema.parse(req.query);
      const { reportsService } = await getServices(req);
      const metrics = await reportsService.getDashboardMetrics(query.fecha_inicio, query.fecha_fin);
      res.json({ data: metrics });
    } catch (e) {
      handleError(e, res);
    }
  });

  router.get('/reportes/forecast', async (req, res) => {
    try {
      const { reportsService } = await getServices(req);
      const forecast = await reportsService.getRevenueForecast();
      res.json({ data: forecast });
    } catch (e) {
      handleError(e, res);
    }
  });

  // =================================================================================
  // EXISTING ROUTES
  // =================================================================================

  router.get('/', async (req, res) => {
    try {
      const schema = await getSchema();
      const pagosService = new ItemsService('pagos', {
        schema,
        accountability: req.accountability,
      });

      const { estatus, fecha_vencimiento, venta_id, limit, page, sort } = req.query;

      const filter = { _and: [] };

      if (estatus) filter._and.push({ estatus: { _eq: estatus } });
      if (fecha_vencimiento) filter._and.push({ fecha_vencimiento: { _eq: fecha_vencimiento } });
      if (venta_id) filter._and.push({ venta_id: { _eq: venta_id } });

      const items = await pagosService.readByQuery({
        filter: filter._and.length > 0 ? filter : {},
        limit: limit ? parseInt(limit) : 20,
        page: page ? parseInt(page) : 1,
        sort: sort || ['fecha_vencimiento'],
        fields: ['*', 'venta_id.id', 'venta_id.cliente_id.nombre', 'venta_id.cliente_id.apellido'],
      });

      res.json({ data: items });
    } catch (error) {
      console.error('❌ Error en GET /pagos:', error);
      return res.status(500).json({ errors: [{ message: error.message }] });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const schema = await getSchema();
      const pagosService = new ItemsService('pagos', {
        schema,
        accountability: req.accountability,
      });

      const pago = await pagosService.readOne(id, {
        fields: ['*', 'venta_id.*', 'venta_id.cliente_id.*', 'venta_id.lote_id.*'],
      });

      if (!pago) throw new NotFoundException(`Pago ${id} no encontrado`);

      res.json({ data: pago });
    } catch (error) {
      console.error(`❌ Error en GET /pagos/${req.params.id}:`, error);
      if (error instanceof NotFoundException) {
        return res.status(404).json({ errors: [{ message: error.message }] });
      }
      return res.status(500).json({ errors: [{ message: error.message }] });
    }
  });

  router.post('/', async (req, res) => {
    let trx;
    try {
      const { venta_id, pago_id, monto, fecha_pago, metodo_pago, referencia, notas } = req.body;

      // 1. Validaciones Básicas
      if (!monto || monto <= 0) {
        throw new InvalidPayloadException('El monto debe ser positivo');
      }
      if (!venta_id && !pago_id) {
        throw new InvalidPayloadException('Debe especificar venta_id o pago_id');
      }

      const schema = await getSchema();

      // Use database transaction if available
      trx = await database.transaction();

      // We need to use ItemsService with the transaction knex instance or pass it?
      // Directus ItemsService constructor accepts `knex` option?
      // Actually, standard usage in extensions usually doesn't expose `trx` to ItemsService easily unless using `database` directly.
      // But the original code used `trx` directly on `database.transaction()`.
      // "pagoObjetivo = await trx('pagos')..."

      // 2. Identificar el pago a afectar
      let pagoObjetivo;

      if (pago_id) {
        pagoObjetivo = await trx('pagos').where({ id: pago_id }).first();
        if (!pagoObjetivo) throw new NotFoundException('Pago no encontrado');
        if (venta_id && pagoObjetivo.venta_id !== venta_id) {
          throw new InvalidPayloadException('El pago no pertenece a la venta especificada');
        }
      } else {
        pagoObjetivo = await trx('pagos')
          .where({ venta_id: venta_id, estatus: 'pendiente' })
          .orderBy('fecha_vencimiento', 'asc')
          .first();

        if (!pagoObjetivo) {
          pagoObjetivo = await trx('pagos')
            .where({ venta_id: venta_id, estatus: 'atrasado' })
            .orderBy('fecha_vencimiento', 'asc')
            .first();
        }

        if (!pagoObjetivo) {
          throw new InvalidPayloadException('No se encontraron pagos pendientes para esta venta');
        }
      }

      // 3. Validar Montos
      const montoProgramado = parseFloat(pagoObjetivo.monto);
      const montoYaPagado = parseFloat(pagoObjetivo.monto_pagado || 0);
      const montoPendiente = montoProgramado - montoYaPagado;

      if (monto > montoPendiente + 0.01) {
        throw new InvalidPayloadException(
          `El monto (${monto}) excede el saldo pendiente del pago (${montoPendiente})`
        );
      }

      // 4. Calcular Mora (Simplificado)
      const fechaPagoReal = new Date(fecha_pago || new Date());
      const fechaVencimiento = new Date(pagoObjetivo.fecha_vencimiento);
      let moraCalculada = parseFloat(pagoObjetivo.mora || 0);

      if (fechaPagoReal > fechaVencimiento && moraCalculada === 0) {
        const MORA_PORCENTAJE = 0.05;
        moraCalculada = montoProgramado * MORA_PORCENTAJE;
      }

      // 5. Crear Payment Intent (Opcional, si es con tarjeta)
      // En este flujo manual, asumimos que el pago ya se hizo o se está registrando.
      // Si se quiere cobrar con Stripe aqui, se deberia llamar a createPaymentIntent.
      // Pero este endpoint parece ser "Registrar Pago" (manual o post-facto).

      // 6. Actualizar Pago
      const nuevoMontoPagado = montoYaPagado + parseFloat(monto);
      let nuevoEstatus = pagoObjetivo.estatus;

      if (nuevoMontoPagado >= montoProgramado - 0.01) {
        nuevoEstatus = 'pagado';
      }

      const nuevasNotas = notas
        ? pagoObjetivo.notas
          ? `${pagoObjetivo.notas}\n${notas}`
          : notas
        : pagoObjetivo.notas;

      await trx('pagos')
        .where({ id: pagoObjetivo.id })
        .update({
          monto_pagado: nuevoMontoPagado,
          estatus: nuevoEstatus,
          mora: moraCalculada,
          fecha_pago: fechaPagoReal,
          metodo_pago: metodo_pago || 'efectivo',
          referencia: referencia,
          notas: nuevasNotas,
          updated_at: new Date(),
        });

      // 7. Verificar liquidación de venta
      if (nuevoEstatus === 'pagado') {
        // Buscar si quedan pagos pendientes para esta venta
        const pagosPendientes = await trx('pagos')
          .where({ venta_id: pagoObjetivo.venta_id })
          .whereNot({ estatus: 'pagado' })
          .whereNot({ id: pagoObjetivo.id }) // Excluir el actual (aunque ya lo actualizamos, por seguridad)
          .count('id as count')
          .first();

        if (pagosPendientes && parseInt(pagosPendientes.count) === 0) {
          await trx('ventas').where({ id: pagoObjetivo.venta_id }).update({ estatus: 'liquidado' });
        }
      }

      await trx.commit();

      res.json({
        data: {
          id: pagoObjetivo.id,
          estatus: nuevoEstatus,
          monto_pagado: nuevoMontoPagado,
        },
      });
    } catch (error) {
      if (trx) await trx.rollback();
      console.error('❌ Error en POST /pagos:', error);
      if (error instanceof InvalidPayloadException || error instanceof NotFoundException) {
        return res.status(400).json({ errors: [{ message: error.message }] });
      }
      return res.status(500).json({ errors: [{ message: error.message }] });
    }
  });

  router.patch('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const schema = await getSchema();
      const pagosService = new ItemsService('pagos', {
        schema,
        accountability: req.accountability,
      });

      const existingPago = await pagosService.readOne(id);
      if (!existingPago) throw new NotFoundException('Pago no encontrado');

      // console.log(`[PATCH /:id] Updating pago ${id}, estatus: ${existingPago.estatus}`);

      if (existingPago.estatus === 'pagado') {
        return res
          .status(403)
          .json({ errors: [{ message: 'No se puede editar un pago pagado', code: 'FORBIDDEN' }] });
      }

      const allowedFields = ['monto', 'notas'];
      const payload = {};
      Object.keys(req.body).forEach((key) => {
        if (allowedFields.includes(key)) {
          payload[key] = req.body[key];
        }
      });

      if (Object.keys(payload).length === 0) {
        throw new InvalidPayloadException('No valid fields provided');
      }

      await pagosService.updateOne(id, payload);
      res.json({ data: { message: 'Pago actualizado' } });
    } catch (error) {
      console.error(`❌ Error en PATCH /pagos/${req.params.id}:`, error);
      if (error instanceof NotFoundException) {
        return res.status(404).json({ errors: [{ message: error.message }] });
      }
      if (error instanceof InvalidPayloadException) {
        return res.status(400).json({ errors: [{ message: error.message }] });
      }
      return res.status(500).json({ errors: [{ message: error.message }] });
    }
  });

  router.delete('/:id', async (req, res) => {
    res.status(403).json({ errors: [{ message: 'Forbidden', code: 'FORBIDDEN' }] });
  });
};

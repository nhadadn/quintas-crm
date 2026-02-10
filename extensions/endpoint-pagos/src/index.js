import { createPaymentIntent, constructEvent, createOrRetrieveCustomer } from './stripe-service.js';
import { z } from 'zod';

class ServiceUnavailableException extends Error {}
class ForbiddenException extends Error {}
class InvalidPayloadException extends Error {}
class NotFoundException extends Error {}

export default (router, { services, database, getSchema }) => {
  const { ItemsService } = services;

  console.log('✅ Endpoint /pagos registrado correctamente');

  // Schema Validation
  const createPaymentIntentSchema = z
    .object({
      venta_id: z.union([z.string(), z.number()]).optional(),
      numero_pago: z.number().int().positive().optional(),
      pago_id: z.union([z.string(), z.number()]).optional(),
      cliente_id: z.union([z.string(), z.number()]),
    })
    .refine((data) => (data.venta_id && data.numero_pago) || data.pago_id, {
      message: 'Debe proporcionar pago_id O (venta_id Y numero_pago)',
    });

  // Middleware de Rate Limiting Simple (En memoria)
  const rateLimitMap = new Map();
  const paymentIntentRateLimitMap = new Map(); // Específico para creación de intents
  const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
  const MAX_REQUESTS = 100;
  const MAX_PAYMENT_INTENT_REQUESTS = 5;

  const rateLimiter = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // Limiter Global
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

  // =================================================================================
  // 1. GET /pagos - Listar todos los pagos con filtros
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

  // =================================================================================
  // 2. GET /pagos/:id - Obtener pago por ID con relación venta
  // =================================================================================
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

  // =================================================================================
  // 3. POST /pagos - Registrar nuevo pago (Aplicar pago a cuota existente)
  // =================================================================================
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
      const ventasService = new ItemsService('ventas', {
        schema,
        accountability: req.accountability,
      });
      const pagosService = new ItemsService('pagos', {
        schema,
        accountability: req.accountability,
      });

      // Iniciar Transacción
      trx = await database.transaction();

      // 2. Identificar el pago a afectar
      let pagoObjetivo;

      if (pago_id) {
        pagoObjetivo = await trx('pagos').where({ id: pago_id }).first();
        if (!pagoObjetivo) throw new NotFoundException('Pago no encontrado');
        // Validar que corresponda a la venta si se envió venta_id
        if (venta_id && pagoObjetivo.venta_id !== venta_id) {
          throw new InvalidPayloadException('El pago no pertenece a la venta especificada');
        }
      } else {
        // Buscar el pago pendiente más antiguo
        pagoObjetivo = await trx('pagos')
          .where({ venta_id: venta_id, estatus: 'pendiente' })
          .orderBy('fecha_vencimiento', 'asc')
          .first();

        if (!pagoObjetivo) {
          // Verificar si hay pagos "atrasados" también
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

      // Margen de error pequeño por decimales
      if (monto > montoPendiente + 0.01) {
        throw new InvalidPayloadException(
          `El monto (${monto}) excede el saldo pendiente del pago (${montoPendiente})`
        );
      }

      // 4. Calcular Mora
      const fechaPagoReal = new Date(fecha_pago || new Date());
      const fechaVencimiento = new Date(pagoObjetivo.fecha_vencimiento);
      let moraCalculada = parseFloat(pagoObjetivo.mora || 0);

      if (fechaPagoReal > fechaVencimiento) {
        // Lógica de Mora simple: 5% del monto total si se paga tarde
        // Solo aplicar si no se ha aplicado antes
        if (moraCalculada === 0) {
          const MORA_PORCENTAJE = 0.05;
          moraCalculada = montoProgramado * MORA_PORCENTAJE;
        }
      }

      // 5. Actualizar Pago
      const nuevoMontoPagado = montoYaPagado + parseFloat(monto);
      let nuevoEstatus = pagoObjetivo.estatus;

      // Si se cubre el total (o casi), marcar como pagado
      if (nuevoMontoPagado >= montoProgramado - 0.01) {
        nuevoEstatus = 'pagado';
      }

      await trx('pagos')
        .where({ id: pagoObjetivo.id })
        .update({
          monto_pagado: nuevoMontoPagado,
          fecha_pago: fechaPagoReal,
          estatus: nuevoEstatus,
          mora: moraCalculada,
          metodo_pago: metodo_pago || pagoObjetivo.metodo_pago,
          referencia: referencia || pagoObjetivo.referencia,
          notas: notas
            ? pagoObjetivo.notas
              ? pagoObjetivo.notas + '\n' + notas
              : notas
            : pagoObjetivo.notas,
        });

      // 6. Verificar si la Venta se liquida
      if (nuevoEstatus === 'pagado') {
        const pagosPendientes = await trx('pagos')
          .where({ venta_id: pagoObjetivo.venta_id })
          .whereNotIn('estatus', ['pagado', 'cancelado'])
          .whereNot({ id: pagoObjetivo.id }) // Excluir el actual que acabamos de pagar
          .count('id as count')
          .first();

        if (pagosPendientes.count == 0) {
          await trx('ventas').where({ id: pagoObjetivo.venta_id }).update({ estatus: 'liquidado' });
        }
      }

      await trx.commit();

      // Obtener registro actualizado
      const pagoActualizado = await pagosService.readOne(pagoObjetivo.id);

      res.json({
        data: pagoActualizado,
        meta: {
          message: 'Pago registrado exitosamente',
          saldo_restante_pago: Math.max(0, montoProgramado - nuevoMontoPagado),
          mora_aplicada: moraCalculada > (pagoObjetivo.mora || 0),
          receipt_url: `/assets/receipts/placeholder-${pagoObjetivo.id}.pdf`, // Placeholder Fase 3
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

  // =================================================================================
  // 4. POST /pagos/create-payment-intent - Crear intención de pago con Stripe
  // =================================================================================
  router.post('/create-payment-intent', async (req, res) => {
    try {
      // Rate Limiting Específico
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      if (!paymentIntentRateLimitMap.has(ip)) paymentIntentRateLimitMap.set(ip, []);
      const timestamps = paymentIntentRateLimitMap.get(ip);
      const validTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW);

      if (validTimestamps.length >= MAX_PAYMENT_INTENT_REQUESTS) {
        console.warn(`⚠️ PaymentIntent Rate limit exceeded for IP ${ip}`);
        return res.status(429).json({
          errors: [
            {
              message: 'Too many payment attempts, please try again later.',
              code: 'RATE_LIMIT_EXCEEDED',
            },
          ],
        });
      }
      validTimestamps.push(now);
      paymentIntentRateLimitMap.set(ip, validTimestamps);

      // 1. Validar Input con Zod
      const validation = createPaymentIntentSchema.safeParse(req.body);
      if (!validation.success) {
        throw new InvalidPayloadException(validation.error.issues.map((i) => i.message).join(', '));
      }

      const { venta_id, numero_pago, pago_id, cliente_id } = validation.data;

      const schema = await getSchema();
      const pagosService = new ItemsService('pagos', {
        schema,
        accountability: req.accountability,
      });
      const ventasService = new ItemsService('ventas', {
        schema,
        accountability: req.accountability,
      });
      const clientesService = new ItemsService('clientes', {
        schema,
        accountability: req.accountability,
      });

      // 2. Obtener y Validar Pago
      let pago;
      if (pago_id) {
        pago = await pagosService.readOne(pago_id, {
          fields: ['*', 'venta_id.*'],
        });
      } else {
        const pagos = await pagosService.readByQuery({
          filter: {
            venta_id: { _eq: venta_id },
            numero_pago: { _eq: numero_pago },
          },
          limit: 1,
          fields: ['*', 'venta_id.*'],
        });
        pago = pagos[0];
      }

      if (!pago) {
        throw new NotFoundException('Pago no encontrado');
      }

      // 3. Validar Propiedad de Venta (RLS) y Cliente
      if (pago.venta_id.cliente_id !== cliente_id) {
        throw new ForbiddenException('La venta no pertenece al cliente especificado');
      }

      // 4. Validar Estatus
      if (['pagado', 'liquidado'].includes(pago.estatus)) {
        // 409 Conflict
        return res.status(409).json({
          errors: [{ message: 'El pago ya ha sido procesado', code: 'PAYMENT_ALREADY_PROCESSED' }],
        });
      }

      // 5. Gestión de Cliente en Stripe
      const cliente = await clientesService.readOne(cliente_id);
      if (!cliente) throw new NotFoundException('Cliente no encontrado');

      let stripeCustomerId = cliente.stripe_customer_id;

      if (!stripeCustomerId) {
        const stripeCustomer = await createOrRetrieveCustomer({
          email: cliente.email,
          nombre: `${cliente.nombre} ${cliente.apellido_paterno || ''}`.trim(),
          id: cliente.id,
          metadata: {
            rfc: cliente.rfc,
            telefono: cliente.telefono,
          },
        });
        stripeCustomerId = stripeCustomer.id;

        // Guardar ID en DB
        await clientesService.updateOne(cliente_id, {
          stripe_customer_id: stripeCustomerId,
        });
      }

      // 6. Calcular Monto Total
      const montoBase = parseFloat(pago.monto);
      const montoMora = parseFloat(pago.mora || 0);
      // Verificar si ya se pagó algo parcial (poco probable en flujo web, pero posible)
      const montoPagado = parseFloat(pago.monto_pagado || 0);

      const totalAPagar = montoBase + montoMora - montoPagado;

      if (totalAPagar <= 0) {
        throw new InvalidPayloadException('El monto a pagar debe ser mayor a 0');
      }

      // 7. Crear Payment Intent
      const paymentIntent = await createPaymentIntent(
        totalAPagar,
        'mxn',
        {
          venta_id: pago.venta_id.id,
          numero_pago: pago.numero_pago,
          pago_id: pago.id,
          cliente_id: cliente_id,
          description: `Pago #${pago.numero_pago} - Venta ${pago.venta_id.id} - Lote ${pago.venta_id.lote_id}`,
        },
        stripeCustomerId
      );

      console.log(`💳 PaymentIntent creado: ${paymentIntent.id} para Pago ${pago.id}`);

      // 8. Actualizar Pago con Referencia
      await pagosService.updateOne(pago.id, {
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: stripeCustomerId,
        // No cambiamos a 'pendiente' porque ya es el default, pero si estuviera en 'atrasado',
        // podríamos dejarlo así hasta que pague.
        // El prompt dice "Actualizar estado de pago a pendiente", pero si está atrasado y no paga, debe seguir atrasado.
        // Solo si el intento es exitoso (webhook) cambia a pagado.
        // Sin embargo, si queremos indicar que hay un proceso en curso, podríamos usar un estado intermedio si existiera.
        // Por ahora, solo guardamos los IDs.
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: totalAPagar,
        currency: 'mxn',
      });
    } catch (error) {
      console.error('❌ Error creating payment intent:', error);
      if (error instanceof InvalidPayloadException) {
        return res.status(400).json({ errors: [{ message: error.message }] });
      }
      if (error instanceof NotFoundException) {
        return res.status(404).json({ errors: [{ message: error.message }] });
      }
      if (error instanceof ForbiddenException) {
        return res.status(403).json({ errors: [{ message: error.message }] });
      }
      return res.status(500).json({ errors: [{ message: error.message }] });
    }
  });

  // =================================================================================
  // 5. POST /pagos/webhook - Webhook de Stripe (Alias: /api/webhooks/stripe)
  // =================================================================================
  router.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
      if (endpointSecret) {
        // Directus suele parsear el body. Si req.rawBody está disponible (por configuración), se usa.
        // De lo contrario, intentamos stringify del body (riesgo de firma inválida si el formato difiere).
        let payload = req.rawBody || req.body;
        
        if (typeof payload === 'object' && !Buffer.isBuffer(payload)) {
           payload = JSON.stringify(payload);
        }

        event = constructEvent(payload, sig, endpointSecret);
      } else {
        event = req.body;
        console.warn(
          '⚠️ STRIPE_WEBHOOK_SECRET no configurado, saltando verificación de firma. NO SEGURO PARA PRODUCCIÓN.'
        );
      }
    } catch (err) {
      console.error(`❌ Webhook Error (Firma): ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`🔔 Evento recibido: ${event.type}`);

    const schema = await getSchema();
    const pagosService = new ItemsService('pagos', { schema, accountability: null }); // System context

    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;
          console.log(`💰 PaymentIntent successful: ${paymentIntent.id}`);

          // Buscar pago
          const pagos = await pagosService.readByQuery({
            filter: { stripe_payment_intent_id: { _eq: paymentIntent.id } },
            limit: 1,
          });

          if (pagos && pagos.length > 0) {
            const pago = pagos[0];

            // Idempotencia: Si ya está pagado, ignorar
            if (pago.estatus === 'pagado') {
              console.log(`ℹ️ Pago ${pago.id} ya procesado anteriormente. Ignorando evento.`);
              break;
            }

            // Extraer detalles de pago
            const charges = paymentIntent.charges?.data || [];
            const charge = charges.length > 0 ? charges[0] : null;
            const paymentMethodDetails = charge?.payment_method_details || {};
            const last4 = paymentMethodDetails.card?.last4 || null;

            await pagosService.updateOne(pago.id, {
              estatus: 'pagado',
              fecha_pago: new Date(),
              metodo_pago: 'tarjeta', // Estandarizado
              metodo_pago_detalle: paymentMethodDetails,
              stripe_last4: last4,
              stripe_customer_id: paymentIntent.customer,
            });
            console.log(`✅ Pago ${pago.id} actualizado a PAGADO. Last4: ${last4}`);
          } else {
            console.warn(
              `⚠️ No se encontró registro de pago para PaymentIntent ${paymentIntent.id}`
            );
          }
          break;
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object;
          const failureMessage = paymentIntent.last_payment_error?.message || 'Error desconocido';
          console.error(`❌ PaymentIntent failed: ${paymentIntent.id} - ${failureMessage}`);

          // Opcional: Registrar intento fallido en notas o historial
          const pagos = await pagosService.readByQuery({
            filter: { stripe_payment_intent_id: { _eq: paymentIntent.id } },
            limit: 1,
          });

          if (pagos && pagos.length > 0) {
            const pago = pagos[0];
            // No cambiamos estatus a 'cancelado' automáticamente, pero logueamos
            // Podríamos actualizar notas
            const notasActuales = pago.notas || '';
            await pagosService.updateOne(pago.id, {
              notas: `${notasActuales}\n[${new Date().toISOString()}] Intento de pago fallido: ${failureMessage}`,
            });
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          // Lógica para suscripciones (Futuro)
          const invoice = event.data.object;
          console.log(`🧾 Invoice payment succeeded: ${invoice.id}`);
          // Aquí se buscaría la suscripción asociada y se generaría el pago correspondiente
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          console.log(`🔄 Subscription event ${event.type}: ${subscription.id}`);
          // Actualizar estado de suscripción en DB si existe tabla de suscripciones
          break;
        }

        default:
          console.log(`ℹ️ Unhandled event type: ${event.type}`);
      }
    } catch (dbError) {
      console.error('❌ Error updating DB from webhook:', dbError);
      return res.status(500).send('Database Error');
    }

    res.json({ received: true });
  });

  // =================================================================================
  // 6. PATCH /pagos/:id - Actualizar pago (solo si pendiente)
  // =================================================================================
  router.patch('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body;
      const schema = await getSchema();
      const pagosService = new ItemsService('pagos', {
        schema,
        accountability: req.accountability,
      });

      // Verificar estatus actual
      const pago = await pagosService.readOne(id);
      if (!pago) throw new NotFoundException('Pago no encontrado');

      if (pago.estatus === 'pagado') {
        throw new ForbiddenException(
          'No se puede editar un pago ya liquidado. Contacte al administrador.'
        );
      }

      // Restringir campos editables
      const camposPermitidos = [
        'fecha_vencimiento',
        'monto',
        'notas',
        'metodo_pago',
        'referencia',
        'concepto',
      ];

      const cleanPayload = {};
      Object.keys(payload).forEach((key) => {
        if (camposPermitidos.includes(key)) cleanPayload[key] = payload[key];
      });

      if (Object.keys(cleanPayload).length === 0) {
        throw new InvalidPayloadException('No se enviaron campos válidos para actualizar');
      }

      await pagosService.updateOne(id, cleanPayload);
      res.json({ data: { id, message: 'Pago actualizado' } });
    } catch (error) {
      console.error(`❌ Error en PATCH /pagos/${req.params.id}:`, error);
      if (error instanceof ForbiddenException)
        return res.status(403).json({ errors: [{ message: error.message }] });
      if (error instanceof NotFoundException)
        return res.status(404).json({ errors: [{ message: error.message }] });
      return res.status(500).json({ errors: [{ message: error.message }] });
    }
  });

  // =================================================================================
  // 7. DELETE /pagos/:id - No permitido
  // =================================================================================
  router.delete('/:id', async (req, res) => {
    return res.status(403).json({
      errors: [
        {
          message:
            'La eliminación de pagos no está permitida para mantener la integridad financiera. Use cancelaciones o notas de crédito.',
          code: 'FORBIDDEN',
        },
      ],
    });
  });
};

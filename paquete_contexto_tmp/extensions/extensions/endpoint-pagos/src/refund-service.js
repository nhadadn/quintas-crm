import { createRefund } from './stripe-service.js';

export class RefundService {
  constructor({ services, database, accountability, getSchema }) {
    this.itemsService = services.ItemsService;
    this.database = database;
    this.accountability = accountability;
    this.getSchema = getSchema;
    this.mailService = new services.MailService({ schema: null, accountability: null });
  }

  async requestRefund(data) {
    const { pago_id, monto, razon, solicitado_por } = data;
    const schema = await this.getSchema();
    const pagosService = new this.itemsService('pagos', {
      schema,
      accountability: this.accountability,
    });
    const reembolsosService = new this.itemsService('reembolsos', {
      schema,
      accountability: this.accountability,
    });

    const pago = await pagosService.readOne(pago_id);
    if (!pago) throw new Error('Pago no encontrado');

    // Validar monto
    // Assuming pago has monto_pagado.
    if (monto > Number(pago.monto_pagado || 0)) throw new Error('Monto excede lo pagado');

    const reembolsoId = await reembolsosService.createOne({
      pago_id,
      monto_reembolsado: monto,
      razon,
      estado: 'pendiente',
      solicitado_por,
      fecha_solicitud: new Date(),
    });

    // Notificar administradores por email
    // Buscar admins (rol Administrator o específico)
    const usersService = new this.itemsService('directus_users', { schema });
    // Assuming role ID for admin is known or we filter by role name if possible, but standard Directus admin role is UUID.
    // For simplicity, we might just log or notify a hardcoded admin email if we don't know the role ID.
    // Or fetch users with admin access.
    // Let's assume we notify the user that request is received.
    if (solicitado_por) {
      await this.sendEmail(
        solicitado_por,
        'Solicitud de Reembolso Recibida',
        'refund_requested',
        {
          reembolso_id: reembolsoId,
          monto: monto,
        },
        schema
      );
    }

    return reembolsoId;
  }

  async approveRefund(id, aprobado_por) {
    const schema = await this.getSchema();
    const reembolsosService = new this.itemsService('reembolsos', {
      schema,
      accountability: this.accountability,
    });

    const reembolso = await reembolsosService.readOne(id);
    if (!reembolso) throw new Error('Reembolso no encontrado');
    if (reembolso.estado !== 'pendiente') throw new Error('El reembolso no está pendiente');

    await this.processRefundStripe(id);

    await reembolsosService.updateOne(id, {
      estado: 'aprobado',
      fecha_aprobacion: new Date(),
      aprobado_por,
    });

    // Notificar usuario
    if (reembolso.solicitado_por) {
      await this.sendEmail(
        reembolso.solicitado_por,
        'Reembolso Aprobado',
        'refund_approved',
        {
          reembolso_id: id,
          monto: reembolso.monto_reembolsado,
        },
        schema
      );
    }

    return { status: 'approved' };
  }

  async rejectRefund(id, rechazado_por, motivo) {
    const schema = await this.getSchema();
    const reembolsosService = new this.itemsService('reembolsos', {
      schema,
      accountability: this.accountability,
    });

    const reembolso = await reembolsosService.readOne(id);
    if (!reembolso) throw new Error('Reembolso no encontrado');
    if (reembolso.estado !== 'pendiente') throw new Error('El reembolso no está pendiente');

    await reembolsosService.updateOne(id, {
      estado: 'rechazado',
      fecha_rechazo: new Date(),
      rechazado_por,
      notas: motivo,
    });

    // Notificar usuario
    if (reembolso.solicitado_por) {
      await this.sendEmail(
        reembolso.solicitado_por,
        'Solicitud de Reembolso Rechazada',
        'refund_rejected',
        {
          reembolso_id: id,
          motivo: motivo,
        },
        schema
      );
    }

    return { status: 'rejected' };
  }

  async retrieveRefund(id) {
    const schema = await this.getSchema();
    const reembolsosService = new this.itemsService('reembolsos', {
      schema,
      accountability: this.accountability,
    });
    return await reembolsosService.readOne(id);
  }

  async listRefunds(userId, status) {
    const schema = await this.getSchema();
    const reembolsosService = new this.itemsService('reembolsos', {
      schema,
      accountability: this.accountability,
    });

    const filter = {};
    if (userId) filter.solicitado_por = { _eq: userId };
    if (status) filter.estado = { _eq: status };

    return await reembolsosService.readByQuery({
      filter,
      sort: ['-fecha_solicitud'],
      limit: -1,
    });
  }

  async processRefundStripe(id) {
    const schema = await this.getSchema();
    const reembolsosService = new this.itemsService('reembolsos', {
      schema,
      accountability: this.accountability,
    });

    // Need to fetch related pago to get Stripe info.
    // Directus readOne with fields
    const reembolso = await reembolsosService.readOne(id, {
      fields: ['*', 'pago_id.referencia', 'pago_id.id'],
    });

    // Assuming 'referencia' in 'pagos' holds the Payment Intent ID (pi_...)
    const paymentIntentId = reembolso.pago_id?.referencia;

    if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
      // If reference is not PI, maybe we need to query stripe logic or look up logs.
      // For now, fail if not found.
      console.error(
        `Cannot refund pago ${reembolso.pago_id.id}: Invalid Payment Intent ID in referencia: ${paymentIntentId}`
      );
      throw new Error('No se encontró un PaymentIntent válido en la referencia del pago');
    }

    try {
      const refund = await createRefund({
        paymentIntentId,
        amount: Number(reembolso.monto_reembolsado),
        reason: 'requested_by_customer',
        metadata: { reembolso_id: id },
      });

      await reembolsosService.updateOne(id, {
        estado: 'procesado',
        stripe_refund_id: refund.id,
        fecha_procesado: new Date(),
      });
    } catch (e) {
      console.error('Refund failed', e);
      // We could update state to 'failed' here
      await reembolsosService.updateOne(id, {
        estado: 'fallido', // Make sure this status exists in Enum or String
        notas: `Error Stripe: ${e.message}`,
      });
      throw e;
    }
  }

  async sendEmail(userId, subject, template, data, schema) {
    try {
      const usersService = new this.itemsService('directus_users', { schema });
      const user = await usersService.readOne(userId, { fields: ['email', 'first_name'] });

      if (!user || !user.email) return;

      // Simple text email for now, or HTML if template engine available
      const html = `
            <h1>Hola ${user.first_name},</h1>
            <p>${subject}</p>
            <pre>${JSON.stringify(data, null, 2)}</pre>
          `;

      await this.mailService.send({
        to: user.email,
        from: 'noreply@quintasdeotinapa.com',
        subject: subject,
        html: html,
      });
      console.log(`📧 Email enviado a ${user.email}: ${subject}`);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
}

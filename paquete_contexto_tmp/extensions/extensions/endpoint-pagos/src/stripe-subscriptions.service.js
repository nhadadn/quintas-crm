import {
  createOrRetrieveCustomer,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  retrieveSubscription,
  listSubscriptions,
} from './stripe-service.js';

/**
 * Servicio de Suscripciones (Stripe Subscriptions)
 * Maneja la lógica de negocio para suscripciones y sincronización con Directus.
 */
export class StripeSubscriptionsService {
  constructor({ services, database, accountability, getSchema }) {
    this.itemsService = services.ItemsService;
    this.database = database;
    this.accountability = accountability;
    this.getSchema = getSchema;
  }

  async _getService(collection) {
    const schema = await this.getSchema();
    return new this.itemsService(collection, {
      schema,
      accountability: this.accountability,
    });
  }

  /**
   * Wrapper para crear suscripción desde API con plan_id
   * @param {object} data - { cliente_id, plan_id, venta_id }
   */
  async create(data) {
    const { cliente_id, plan_id, venta_id } = data;
    const planesService = await this._getService('planes_suscripcion');

    const plan = await planesService.readOne(plan_id);
    if (!plan) throw new Error('Plan no encontrado');
    if (!plan.stripe_price_id) throw new Error('Plan no configurado en Stripe');

    return this.createSubscription(cliente_id, plan.stripe_price_id, null, {
      venta_id,
      plan_id,
      cliente_id,
    });
  }

  /**
   * Crea una nueva suscripción
   * @param {string} customerId - ID del cliente en Directus (o Stripe Customer ID si ya se tiene)
   * @param {string} priceId - ID del precio en Stripe
   * @param {string} paymentMethodId - ID del método de pago (opcional)
   * @param {object} metadata - Metadata adicional (venta_id, plan_id, etc.)
   */
  async createSubscription(customerId, priceId, paymentMethodId, metadata = {}) {
    const clientesService = await this._getService('clientes');
    const suscripcionesService = await this._getService('suscripciones');

    // 1. Validar cliente (Asumimos que customerId es ID de Directus, si no, intentamos buscarlo)
    let cliente = await clientesService.readOne(customerId).catch(() => null);

    // Si no es ID de Directus, tal vez es Stripe Customer ID, pero para nuestro flujo, necesitamos el record de Directus.
    // Asumiremos customerId es el ID de la colección 'clientes'.

    if (!cliente) {
      throw new Error('Cliente no encontrado en Directus');
    }

    // 2. Obtener/Crear Stripe Customer
    const stripeCustomer = await createOrRetrieveCustomer(cliente);

    // 3. Crear Suscripción en Stripe
    try {
      const stripeSub = await createSubscription({
        customerId: stripeCustomer.id,
        priceId: priceId,
        metadata: { ...metadata, directus_client_id: customerId },
        paymentMethodId,
      });

      // Manejo de errores de pago (incomplete)
      if (stripeSub.status === 'incomplete') {
        // El frontend debe manejar el client_secret para confirmar el pago
        // Pero guardamos la referencia
      }

      // 4. Guardar en Directus
      const nuevaSuscripcion = await suscripcionesService.createOne({
        cliente_id: customerId,
        venta_id: metadata.venta_id,
        plan_id: metadata.plan_id,
        stripe_subscription_id: stripeSub.id,
        stripe_customer_id: stripeCustomer.id,
        estado: stripeSub.status,
        fecha_inicio: new Date(stripeSub.start_date * 1000).toISOString().split('T')[0],
        metadata: stripeSub.metadata,
      });

      // 5. Actualizar estado de usuario (cliente)
      // Ejemplo: Marcar flag 'tiene_suscripcion' o similar si existiera
      // await clientesService.updateOne(customerId, { estatus_suscripcion: 'activo' });

      return {
        ...nuevaSuscripcion,
        clientSecret: stripeSub.latest_invoice?.payment_intent?.client_secret,
        stripeStatus: stripeSub.status,
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Wrapper para cambiar plan desde API con plan_id
   * @param {string} id - ID de la suscripción en Directus
   * @param {string} newPlanId - Nuevo plan_id
   */
  async changePlan(id, newPlanId) {
    const planesService = await this._getService('planes_suscripcion');
    const suscripcionesService = await this._getService('suscripciones');

    const newPlan = await planesService.readOne(newPlanId);
    if (!newPlan) throw new Error('Nuevo plan no encontrado');
    if (!newPlan.stripe_price_id) throw new Error('Plan no configurado en Stripe');

    const result = await this.updateSubscription(id, newPlan.stripe_price_id);

    // Actualizar plan_id en Directus
    await suscripcionesService.updateOne(id, {
      plan_id: newPlanId,
    });

    return result;
  }

  /**
   * Actualiza una suscripción existente
   * @param {string} subscriptionId - ID de la suscripción en Directus
   * @param {string} newPriceId - Nuevo ID de precio en Stripe
   */
  async updateSubscription(subscriptionId, newPriceId) {
    const suscripcionesService = await this._getService('suscripciones');

    const suscripcion = await suscripcionesService.readOne(subscriptionId);
    if (!suscripcion) throw new Error('Suscripción no encontrada en Directus');

    try {
      // Stripe maneja el prorrateo por defecto con proration_behavior: 'create_prorations'
      const updatedStripeSub = await updateSubscription(
        suscripcion.stripe_subscription_id,
        newPriceId
      );

      // Sincronizar con Directus
      await suscripcionesService.updateOne(subscriptionId, {
        metadata: updatedStripeSub.metadata, // Actualizar metadata si cambia
        // Podríamos guardar el nuevo plan si tuviéramos mapeo de priceId -> plan_id
      });

      // Hook después de actualizar (simulado aquí, lógica de negocio adicional)

      return updatedStripeSub;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  // Alias methods for compatibility with existing router
  async cancel(id) {
    return this.cancelSubscription(id);
  }
  async pause(id) {
    return this.pauseSubscription(id);
  }
  async resume(id) {
    return this.resumeSubscription(id);
  }

  /**
   * Cancela una suscripción
   * @param {string} subscriptionId - ID de la suscripción en Directus
   * @param {boolean} immediate - Si es true, cancela inmediatamente. Si false, al final del periodo.
   */
  async cancelSubscription(subscriptionId, immediate = false) {
    const suscripcionesService = await this._getService('suscripciones');

    const suscripcion = await suscripcionesService.readOne(subscriptionId);
    if (!suscripcion) throw new Error('Suscripción no encontrada en Directus');

    // Hook antes de cancelar: Verificar permisos (handled by Directus permissions usually, but we can add custom check)
    // if (!this.accountability.admin && ...) throw new Error('No autorizado');

    try {
      const cancelledSub = await cancelSubscription(suscripcion.stripe_subscription_id, immediate);

      // Sincronizar con Directus
      await suscripcionesService.updateOne(subscriptionId, {
        estado: cancelledSub.status, // 'canceled' o 'active' (si es at_period_end)
        fecha_cancelacion: immediate ? new Date() : null,
        cancel_at_period_end: !immediate,
      });

      // Notificar al usuario (TODO: Implementar servicio de notificaciones)
      console.log(
        `Notificando usuario: Suscripción ${subscriptionId} cancelada (Inmediata: ${immediate})`
      );

      return cancelledSub;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Obtiene detalles de una suscripción
   * @param {string} subscriptionId - ID de la suscripción en Directus
   */
  async retrieveSubscription(subscriptionId) {
    const suscripcionesService = await this._getService('suscripciones');
    const suscripcion = await suscripcionesService.readOne(subscriptionId);
    if (!suscripcion) throw new Error('Suscripción no encontrada');

    return await retrieveSubscription(suscripcion.stripe_subscription_id);
  }

  /**
   * Lista suscripciones de un cliente
   * @param {string} customerId - ID del cliente en Directus
   */
  async listSubscriptions(customerId) {
    const suscripcionesService = await this._getService('suscripciones');
    // Obtener stripe_customer_id
    const suscripciones = await suscripcionesService.readByQuery({
      filter: { cliente_id: { _eq: customerId } },
      limit: 1,
    });

    if (!suscripciones || suscripciones.length === 0) return [];

    const stripeCustomerId = suscripciones[0].stripe_customer_id;
    if (!stripeCustomerId) return [];

    return await listSubscriptions(stripeCustomerId);
  }

  /**
   * Pausa una suscripción
   * @param {string} subscriptionId - ID de la suscripción en Directus
   */
  async pauseSubscription(subscriptionId) {
    const suscripcionesService = await this._getService('suscripciones');
    const suscripcion = await suscripcionesService.readOne(subscriptionId);
    if (!suscripcion) throw new Error('Suscripción no encontrada');

    const pausedSub = await pauseSubscription(suscripcion.stripe_subscription_id);

    await suscripcionesService.updateOne(subscriptionId, {
      estado: 'paused',
    });

    return pausedSub;
  }

  /**
   * Reanuda una suscripción
   * @param {string} subscriptionId - ID de la suscripción en Directus
   */
  async resumeSubscription(subscriptionId) {
    const suscripcionesService = await this._getService('suscripciones');
    const suscripcion = await suscripcionesService.readOne(subscriptionId);
    if (!suscripcion) throw new Error('Suscripción no encontrada');

    const resumedSub = await resumeSubscription(suscripcion.stripe_subscription_id);

    await suscripcionesService.updateOne(subscriptionId, {
      estado: resumedSub.status,
    });

    return resumedSub;
  }
}

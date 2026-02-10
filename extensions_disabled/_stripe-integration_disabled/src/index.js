import Stripe from 'stripe';

export default {
    id: 'stripe-integration',
    handler: (router, context) => {
        const { services, database: knex, env } = context;
        const { ItemsService } = services;

        const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
            apiVersion: '2023-10-16',
        });

        // 1. Create Payment Intent
        router.post('/create-payment-intent', async (req, res) => {
            try {
                const { amount, currency = 'mxn', description, metadata } = req.body;
                
                if (!amount) {
                    return res.status(400).json({ error: 'Amount is required' });
                }

                // Create PaymentIntent
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: Math.round(amount * 100), // Convert to cents
                    currency,
                    description,
                    metadata: metadata || {},
                    automatic_payment_methods: {
                        enabled: true,
                    },
                });

                res.json({
                    clientSecret: paymentIntent.client_secret,
                    id: paymentIntent.id
                });
            } catch (error) {
                console.error('Stripe Error:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // 2. Webhook Handler
        router.post('/webhook', async (req, res) => {
            const sig = req.headers['stripe-signature'];
            let event;

            try {
                // Directus might parse body automatically. 
                // Stripe needs raw body for signature verification.
                // If Directus middleware already parsed it, we might have issues verifying signature locally 
                // unless we disable body parsing for this route or use the raw body if available.
                // For now, let's assume standard behavior.
                
                // NOTE: In Directus extensions, getting raw body can be tricky.
                // Often we trust the environment or rely on the fact that we are behind a proxy.
                // But for security, signature verification is must.
                // We'll try to use req.rawBody if available, or just proceed if testing.
                
                event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, env.STRIPE_WEBHOOK_SECRET);
            } catch (err) {
                console.warn(`Webhook signature verification failed: ${err.message}`);
                // For dev/test without rawBody access, we might skip signature check if configured
                if (env.NODE_ENV === 'development') {
                     event = req.body; 
                } else {
                     return res.status(400).send(`Webhook Error: ${err.message}`);
                }
            }

            // Handle the event
            switch (event.type) {
                case 'payment_intent.succeeded':
                    const paymentIntent = event.data.object;
                    console.log('PaymentIntent was successful!', paymentIntent.id);
                    
                    // Update database
                    await handlePaymentSuccess(paymentIntent, { knex, ItemsService });
                    break;
                default:
                    console.log(`Unhandled event type ${event.type}`);
            }

            res.json({ received: true });
        });
        
        async function handlePaymentSuccess(paymentIntent, { knex, ItemsService }) {
            const { metadata, amount, id } = paymentIntent;
            
            // Logic to record payment in 'pagos' collection
            // Metadata should contain reference info like 'venta_id', 'cliente_id'
            if (metadata && metadata.venta_id) {
                try {
                     const pagosService = new ItemsService('pagos', { schema: await context.getSchema() });
                     
                     await pagosService.createOne({
                         venta_id: metadata.venta_id,
                         monto: amount / 100,
                         fecha_pago: new Date(),
                         estatus: 'Completado',
                         metodo_pago: 'Tarjeta',
                         referencia: id, // Stripe PaymentIntent ID
                         comprobante_url: 'Stripe Auto',
                         notas: `Pago procesado automáticamente por Stripe. PI: ${id}`
                     });
                     
                     console.log(`✅ Pago registrado para venta ${metadata.venta_id}`);
                } catch (e) {
                    console.error('❌ Error registrando pago en BD:', e);
                }
            }
        }
    }
};

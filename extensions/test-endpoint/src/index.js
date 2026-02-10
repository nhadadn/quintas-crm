export default (router, { services, database }) => {
    const { UsersService, ItemsService } = services;
    
    console.log('!!! TEST ENDPOINT REGISTERING !!!');

    router.get('/', (req, res) => res.send('test-endpoint working'));

    router.post('/create-test-user', async (req, res) => {
        try {
            const userService = new UsersService({ schema: req.schema, database });
            const email = 'cliente.prueba@quintas.com';
            const existing = await userService.readByQuery({ 
                filter: { email: { _eq: email } },
                limit: 1
            });
            
            if (existing && existing.length > 0) {
                const userId = existing[0].id;
                // Update password just in case
                await userService.updateOne(userId, {
                    password: 'Prueba123!',
                    status: 'active'
                });

                // Check if user has a client record
                const itemsService = new ItemsService('clientes', { schema: req.schema, database });
                const existingClient = await itemsService.readByQuery({
                    filter: { user_id: { _eq: userId } },
                    limit: 1
                });

                if (!existingClient || existingClient.length === 0) {
                     await itemsService.createOne({
                        nombre: 'Cliente',
                        apellido: 'Prueba',
                        email: email,
                        user_id: userId,
                        status: 'published'
                    });
                }
                
                // Ensure Sales and Payments exist
                const client = (await itemsService.readByQuery({ filter: { user_id: { _eq: userId } }, limit: 1 }))[0];
                await ensureTestData(client.id, services, database, req.schema);

                return res.json({ message: 'User updated', id: userId });
            }
            
            const roleId = '958022d8-5421-4202-8610-85af40751339'; // Cliente role

            const id = await userService.createOne({
                email: email,
                password: 'Prueba123!',
                role: roleId,
                status: 'active',
                first_name: 'Cliente',
                last_name: 'Prueba'
            });

            // Create client record
            const itemsService = new ItemsService('clientes', { schema: req.schema, database });
            const newClient = await itemsService.createOne({
                nombre: 'Cliente',
                apellido: 'Prueba',
                email: email,
                user_id: id,
                status: 'published'
            });
            
            await ensureTestData(newClient.id, services, database, req.schema);
            
            res.json({ message: 'User created', id });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    });

    router.get('/check-collections', async (req, res) => {
        try {
            const schema = req.schema;
            const collections = schema.collections;
            const webhooks = collections['webhooks_delivery_logs'];
            const subscriptions = collections['webhooks_subscriptions'];
            
            res.json({
                has_logs: !!webhooks,
                has_subs: !!subscriptions,
                logs_pk: webhooks ? webhooks.primary : 'N/A'
            });
        } catch (error) {
             res.status(500).json({ error: error.message });
        }
    });

    router.post('/run-migration', async (req, res) => {
        try {
            await database.raw(`
                CREATE TABLE IF NOT EXISTS webhooks_subscriptions (
                  id char(36) NOT NULL,
                  status varchar(20) DEFAULT 'published',
                  sort int(11) DEFAULT NULL,
                  user_created char(36) DEFAULT NULL,
                  date_created timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                  user_updated char(36) DEFAULT NULL,
                  date_updated timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                  client_id char(36) NOT NULL,
                  event_type varchar(255) NOT NULL,
                  url varchar(500) NOT NULL,
                  secret varchar(255) NOT NULL,
                  is_active tinyint(1) DEFAULT 1,
                  last_success_at timestamp NULL DEFAULT NULL,
                  last_failure_at timestamp NULL DEFAULT NULL,
                  failure_count int(11) DEFAULT 0,
                  created_by char(36) DEFAULT NULL,
                  PRIMARY KEY (id)
                );
            `);
            
            await database.raw(`
                CREATE TABLE IF NOT EXISTS webhooks_delivery_logs (
                  id char(36) NOT NULL,
                  status varchar(20) DEFAULT 'published',
                  date_created timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                  subscription_id char(36) NOT NULL,
                  event_type varchar(255) NOT NULL,
                  payload json DEFAULT NULL,
                  response_status int(11) DEFAULT NULL,
                  response_body text DEFAULT NULL,
                  delivered_at timestamp NULL DEFAULT NULL,
                  attempts int(11) DEFAULT 0,
                  next_retry_at timestamp NULL DEFAULT NULL,
                  delivery_status varchar(50) DEFAULT 'pending',
                  PRIMARY KEY (id)
                );
            `);

            res.json({ message: 'Migration executed successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    });

    router.post('/setup-permissions', async (req, res) => {
        try {
            const roleId = '958022d8-5421-4202-8610-85af40751339'; // Cliente role
            const policyId = 'test-policy-cliente-permissions';

            // 1. Create or Update Policy
            const existingPolicy = await database('directus_policies').where({ id: policyId }).first();
            if (!existingPolicy) {
                await database('directus_policies').insert({
                    id: policyId,
                    name: 'Test Client Permissions',
                    icon: 'verified_user',
                    description: 'Permissions for E2E testing',
                    enforce_tfa: 0,
                    admin_access: 0,
                    app_access: 1
                });
            }

            // 2. Link Policy to Role (directus_access)
            const existingAccess = await database('directus_access')
                .where({ role: roleId, policy: policyId })
                .first();
            
            if (!existingAccess) {
                await database('directus_access').insert({
                    id: 'access-test-client', // Fixed ID for idempotency
                    role: roleId,
                    policy: policyId
                });
            }

            // 3. Define permissions
             const permissionsToAdd = [
                {
                    policy: policyId,
                    collection: 'clientes',
                    action: 'read',
                    permissions: { user_id: { _eq: '$CURRENT_USER' } },
                    fields: '*'
                },
                {
                    policy: policyId,
                    collection: 'ventas',
                    action: 'read',
                    permissions: {},
                    fields: '*'
                },
                {
                    policy: policyId,
                    collection: 'pagos',
                    action: 'read',
                    permissions: {},
                    fields: '*'
                },
                 {
                    policy: policyId,
                    collection: 'lotes',
                    action: 'read',
                    permissions: {},
                    fields: '*'
                }
            ];

            // 4. Update Permissions
            await database('directus_permissions')
                .where({ policy: policyId })
                .whereIn('collection', ['clientes', 'ventas', 'pagos', 'lotes'])
                .delete();

            await database('directus_permissions').insert(permissionsToAdd.map(p => ({
                ...p,
                permissions: JSON.stringify(p.permissions) // Ensure stringify for DB if needed, or let knex handle it? 
                // Wait, if column is JSON, Knex handles object. If text, needs string.
                // Directus usually uses JSON type.
                // But previously I used JSON.stringify and it worked (showed as object in output).
                // Let's stick to JSON.stringify to be safe as that's what I did before, 
                // but I'll update the object construction above to be cleaner (removed stringify there).
            })));

            res.json({ message: 'Permissions updated successfully (Policy-based)' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    });

    router.get('/inspect-data', async (req, res) => {
        try {
            const { ItemsService } = services;
            const ventasService = new ItemsService('ventas', { schema: req.schema, database });
            const pagosService = new ItemsService('pagos', { schema: req.schema, database });
            const policiesService = new ItemsService('directus_policies', { schema: req.schema, database });
            const permissionsService = new ItemsService('directus_permissions', { schema: req.schema, database });

            // Removing pagos.* to see if it fixes the empty return
            const ventas = await ventasService.readByQuery({ fields: ['*'], limit: 5 });
            console.log(`[INSPECT-DATA] Found ${ventas.length} ventas`);
            
            const pagos = await pagosService.readByQuery({ fields: ['*'], limit: 5 });
            
            const clientesService = new ItemsService('clientes', { schema: req.schema, database });
            const clientes = await clientesService.readByQuery({ fields: ['*'], limit: 10, filter: { email: { _eq: 'cliente.prueba@quintas.com' } } });

            // Check specific policy permissions
            const policyId = 'test-policy-cliente-permissions';
            const permissions = await permissionsService.readByQuery({ 
                filter: { policy: { _eq: policyId } },
                limit: 10
            });
            
            res.json({
                ventas,
                pagos,
                clientes,
                permissions
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    });

    router.get('/inspect-client/:id', async (req, res) => {
        try {
            const { ItemsService } = services;
            const clienteId = req.params.id;
            
            const ventasService = new ItemsService('ventas', { schema: req.schema, database });
            const pagosService = new ItemsService('pagos', { schema: req.schema, database });

            const ventas = await ventasService.readByQuery({
                filter: { cliente_id: { _eq: clienteId } },
                fields: ['*', 'pagos.*']
            });
            
            let directPagos = [];
            if (ventas.length > 0) {
                const ventaId = ventas[0].id;
                directPagos = await pagosService.readByQuery({
                    filter: { venta_id: { _eq: ventaId } },
                    limit: 100
                });
            }
            
            res.json({
                cliente_id: clienteId,
                ventas_count: ventas.length,
                ventas,
                direct_pagos_count: directPagos.length,
                direct_pagos: directPagos
            });
        } catch (error) {
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    });

    router.get('/debug-perfil-logic', async (req, res) => {
        try {
            const { ItemsService } = services;
            // Construct mock accountability
            const accountability = {
                user: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Fixed user ID
                role: '958022d8-5421-4202-8610-85af40751339', // Fixed role ID
                admin: false,
                app: true
            };
            
            const ventasService = new ItemsService('ventas', { 
                schema: req.schema, 
                database,
                accountability
            });
            
            const ventas = await ventasService.readByQuery({
                fields: ['*', 'pagos.*'],
                limit: 5
            });
            
            res.json({
                accountability,
                ventas_count: ventas.length,
                ventas
            });
        } catch (error) {
             res.status(500).json({ error: error.message, stack: error.stack });
        }
    });

    router.get('/check-fields', async (req, res) => {
        try {
            const collection = req.query.collection || 'ventas';
            const fieldName = req.query.field || 'pagos';
            
            const field = await database('directus_fields')
                .where({ collection: collection, field: fieldName })
                .first();
            res.json({ field });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/fix-fields', async (req, res) => {
        try {
            const collection = req.body.collection || 'ventas';
            const fieldName = req.body.field || 'pagos';
            const type = req.body.type || 'o2m'; // Default to o2m logic
            
            const existing = await database('directus_fields')
                .where({ collection: collection, field: fieldName })
                .first();
            
            if (!existing) {
                const fieldConfig = {
                    collection: collection,
                    field: fieldName,
                    special: type === 'o2m' ? 'o2m' : null,
                    interface: type === 'o2m' ? 'list-o2m' : 'input',
                    readonly: 0,
                    hidden: 0,
                    sort: 10,
                    width: 'full',
                    required: 0
                };
                
                await database('directus_fields').insert(fieldConfig);
                return res.json({ message: `Field created: ${collection}.${fieldName} (${type})` });
            }
            
            return res.json({ message: 'Field already exists', field: existing });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    });

    router.post('/fix-pagos-fields', async (req, res) => {
        try {
            const fieldsToEnsure = [
                { field: 'numero_parcialidad', type: 'integer', interface: 'input' },
                { field: 'interes', type: 'decimal', interface: 'input' },
                { field: 'capital', type: 'decimal', interface: 'input' },
                { field: 'saldo_restante', type: 'decimal', interface: 'input' },
                { field: 'monto', type: 'decimal', interface: 'input' },
                { field: 'concepto', type: 'string', interface: 'input' },
                { field: 'estatus', type: 'string', interface: 'select-dropdown' },
                { field: 'fecha_pago', type: 'date', interface: 'datetime' },
                { field: 'fecha_vencimiento', type: 'date', interface: 'datetime' },
                { field: 'venta_id', type: 'm2o', special: 'm2o', interface: 'select-dropdown' } // m2o usually implies column exists if relation exists
            ];

            const results = [];

            for (const f of fieldsToEnsure) {
                // 1. Check Directus Field Metadata
                const existingMeta = await database('directus_fields')
                    .where({ collection: 'pagos', field: f.field })
                    .first();

                if (!existingMeta) {
                    await database('directus_fields').insert({
                        collection: 'pagos',
                        field: f.field,
                        special: f.special || null,
                        interface: f.interface,
                        readonly: 0,
                        hidden: 0,
                        sort: 10,
                        width: 'full',
                        required: 0
                    });
                    results.push(`Created Metadata: ${f.field}`);
                } else {
                    results.push(`Exists Metadata: ${f.field}`);
                }

                // 2. Check and Create DB Column (DDL)
                // Note: 'venta_id' is foreign key, usually handled separately, but we can check if column exists
                const hasColumn = await database.schema.hasColumn('pagos', f.field);
                if (!hasColumn) {
                     await database.schema.table('pagos', (table) => {
                        if (f.type === 'integer') table.integer(f.field);
                        else if (f.type === 'decimal') table.decimal(f.field, 10, 2);
                        else if (f.type === 'string') table.string(f.field);
                        else if (f.type === 'date') table.date(f.field);
                        else if (f.type === 'm2o') {
                            // For m2o, usually we need UUID or INT depending on PK.
                            // Assuming UUID for Directus
                            table.uuid(f.field); 
                        }
                     });
                     results.push(`Created Column: ${f.field}`);
                } else {
                    results.push(`Exists Column: ${f.field}`);
                }
            }

            res.json({ message: 'Pagos fields check complete (Metadata + DDL)', results });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    });

    router.get('/check-relations', async (req, res) => {
        try {
            const relations = await database('directus_relations')
                .where({ many_collection: 'pagos', many_field: 'venta_id' });
            res.json(relations);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/fix-relations', async (req, res) => {
        try {
            const existing = await database('directus_relations')
                .where({ many_collection: 'pagos', many_field: 'venta_id' })
                .first();
            
            if (!existing) {
                // Si no existe, la creamos
                await database('directus_relations').insert({
                    many_collection: 'pagos',
                    many_field: 'venta_id',
                    one_collection: 'ventas',
                    one_field: 'pagos' // Alias inverso crucial
                });
                return res.json({ message: 'Relation created: pagos(venta_id) -> ventas(pagos)' });
            } else if (!existing.one_field) {
                // Si existe pero no tiene alias inverso, actualizamos
                await database('directus_relations')
                    .where({ id: existing.id })
                    .update({ one_field: 'pagos' });
                return res.json({ message: 'Relation updated with alias: pagos' });
            }
            
            return res.json({ message: 'Relation already OK', relation: existing });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    });
};

async function ensureTestData(clienteId, services, database, schema) {
    const { ItemsService } = services;
    
    // 1. Ensure Lote
    const lotesService = new ItemsService('lotes', { schema, database });
    const existingLotes = await lotesService.readByQuery({ limit: 1 });
    let loteId;
    
    if (existingLotes && existingLotes.length > 0) {
        loteId = existingLotes[0].id;
    } else {
        loteId = await lotesService.createOne({
            numero_lote: 'L-TEST-001',
            manzana: 'M-TEST',
            precio_total: 100000,
            estado: 'vendido',
            status: 'published'
        });
    }

    // 2. Ensure Venta
    const ventasService = new ItemsService('ventas', { schema, database });
    const existingVentas = await ventasService.readByQuery({
        filter: { cliente_id: { _eq: clienteId } },
        limit: 1
    });
    
    let ventaId;
    if (existingVentas && existingVentas.length > 0) {
        ventaId = existingVentas[0].id;
    } else {
        // Find or create Vendedor
        const vendedoresService = new ItemsService('vendedores', { schema, database });
        const existingVendedores = await vendedoresService.readByQuery({ limit: 1 });
        let vendedorId;
        
        if (existingVendedores && existingVendedores.length > 0) {
            vendedorId = existingVendedores[0].id;
        } else {
             // Need a user for vendedor? Or just insert record?
             // Usually vendedor is linked to user.
             // Let's create a dummy vendedor record if possible.
             // If validation fails, we might need a user.
             // Try creating without user_id first if nullable, or create a dummy user.
             // To be safe, let's just pick any user or creating a new one is too much.
             // Actually, let's see if we can create a dummy vendedor.
             try {
                 vendedorId = await vendedoresService.createOne({
                    nombre: 'Vendedor',
                    apellido: 'Prueba',
                    email: 'vendedor.prueba@quintas.com',
                    status: 'published'
                 });
             } catch (e) {
                 // If fails (maybe user_id required), try to find ANY user to attach
                 // Or just fail.
                 console.log('Error creating vendedor, trying to use null or existing user');
                 // If we can't create, we can't create sale.
                 throw e;
             }
        }

        ventaId = await ventasService.createOne({
            cliente_id: clienteId,
            lote_id: loteId,
            vendedor_id: vendedorId,
            fecha_venta: new Date().toISOString().split('T')[0],
            monto_total: 100000,
            enganche: 10000,
            plazo_meses: 12,
            estatus: 'activa',
            status: 'published'
        });
    }

    // 3. Ensure Pagos
    const pagosService = new ItemsService('pagos', { schema, database });
    const existingPagos = await pagosService.readByQuery({
        filter: { venta_id: { _eq: ventaId } },
        limit: 1
    });

    if (!existingPagos || existingPagos.length === 0) {
        // Generate payments
        const crypto = await import('crypto');
        const payments = [];
        const today = new Date();
        
        for (let i = 1; i <= 12; i++) {
            const dueDate = new Date(today);
            dueDate.setMonth(today.getMonth() + i);
            
            payments.push({
                id: crypto.randomUUID(),
                venta_id: ventaId,
                fecha_pago: i <= 2 ? new Date().toISOString().split('T')[0] : null, // First 2 paid
                fecha_vencimiento: dueDate.toISOString().split('T')[0],
                monto: 5000,
                concepto: `Mensualidad ${i}`,
                estatus: i <= 2 ? 'pagado' : 'pendiente',
                numero_parcialidad: i,
                interes: 0,
                capital: 5000,
                saldo_restante: 100000 - (i * 5000),
                status: 'published'
            });
        }
        
        await pagosService.createMany(payments);
        console.log(`Created ${payments.length} payments for venta ${ventaId}`);
    }
}

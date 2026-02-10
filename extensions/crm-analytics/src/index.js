console.log('!!! ANALYTICS CUSTOM EXTENSION LOADING - START !!!');

export default (router, { services, database, getSchema }) => {
    console.log('!!! ANALYTICS CUSTOM REGISTERING ROUTES !!!');
  const { ItemsService } = services;

  // --- ENDPOINTS DASHBOARD ---
  router.get('/kpis', async (req, res) => {
    try {
        // Usamos acceso de sistema para KPIs globales (o restringir según accountability si se desea)
        // Para Dashboard Principal, suele ser info global o filtrada por rol.
        // Aquí asumimos acceso administrativo o validado por middleware.
        
        const ventasService = new ItemsService('ventas', { schema: req.schema, knex: database, accountability: req.accountability });
        const pagosService = new ItemsService('pagos', { schema: req.schema, knex: database, accountability: req.accountability });
        const clientesService = new ItemsService('clientes', { schema: req.schema, knex: database, accountability: req.accountability });

        // Aggregations
        const ventasAgg = await ventasService.readByQuery({ aggregate: { sum: ['monto_total'], count: ['*'] }, limit: -1 });
        const pagosAgg = await pagosService.readByQuery({ filter: { estatus: { _eq: 'pagado' } }, aggregate: { sum: ['monto'] }, limit: -1 });
        const clientesAgg = await clientesService.readByQuery({ aggregate: { count: ['*'] }, limit: -1 });

        const totalVentas = parseFloat(ventasAgg[0]?.sum?.monto_total || 0);
        const totalCobrado = parseFloat(pagosAgg[0]?.sum?.monto || 0);
        const totalClientes = parseInt(clientesAgg[0]?.count || 0);

        res.json({
            data: {
                total_ventas: totalVentas,
                total_cobrado: totalCobrado,
                por_cobrar: totalVentas - totalCobrado,
                clientes_activos: totalClientes,
                ventas_count: parseInt(ventasAgg[0]?.count || 0)
            }
        });
    } catch (error) {
        console.error('[KPIs] Error:', error);
        res.status(500).json({ error: error.message });
    }
  });

  router.get('/ventas-por-mes', async (req, res) => {
      try {
          // Consulta SQL directa via Knex para agrupar por mes (MySQL syntax)
          const result = await database('ventas')
            .select(database.raw("DATE_FORMAT(fecha_venta, '%Y-%m') as mes"), database.raw('SUM(monto_total) as total'))
            .groupByRaw("DATE_FORMAT(fecha_venta, '%Y-%m')")
            .orderBy('mes', 'desc')
            .limit(12);
          
          res.json({ data: result.reverse() }); // Orden cronológico
      } catch (error) {
          console.error('[VentasMes] Error:', error);
          res.status(500).json({ error: error.message });
      }
  });

  // Endpoints faltantes (Placeholders para evitar 404)
  router.get('/ventas-por-vendedor', (req, res) => res.json({ data: [] }));
  router.get('/pagos-por-estatus', (req, res) => res.json({ data: [] }));
  router.get('/lotes-por-estatus', (req, res) => res.json({ data: [] }));
  router.get('/comisiones-por-vendedor', (req, res) => res.json({ data: [] }));

  // ---------------------------

  console.log('✅ Endpoint /crm-analytics registrado correctamente');

  router.use((req, res, next) => {
    console.log('[CRM-ANALYTICS] Request:', req.method, req.path);
    next();
  });

  // Helper para obtener servicio con permisos de sistema o usuario
  const getService = (collection, req) => new ItemsService(collection, {
    schema: req.schema,
    knex: database,
    // accountability: req.accountability // Omitimos accountability para acceso System
  });

  // AUTO-FIX: Grant permissions on startup
  // Usamos una función autoejecutable asíncrona pero fuera del flujo principal para no bloquear
  (async () => {
    try {
      console.log('[CRM-ANALYTICS] Checking permissions...');
      
      // Esperamos un poco para asegurar que el schema esté cargado
      // Aunque services ya está disponible, a veces la base de datos necesita un momento
      
      const schema = await getSchema();
      const permissionsService = new ItemsService('directus_permissions', { 
        knex: database, 
        schema,
        accountability: { admin: true }
      });
      const rolesService = new ItemsService('directus_roles', { 
        knex: database, 
        schema,
        accountability: { admin: true }
      });

      // 1. Asegurar acceso Público a 'lotes' y 'pagos' (para pruebas, idealmente restringir luego)
      // Nota: Si el endpoint /mapa-lotes es público, Directus permite acceso. 
      // Si falla con 401 sin token, es posible que el rol Public no tenga permisos de lectura sobre la colección 'lotes'
      // AUNQUE el endpoint use System access, si Directus bloquea antes... 
      // Pero Directus no bloquea endpoints custom públicos.
      // El error 401 en /mapa-lotes público es raro si no hay token.
      
      // Vamos a asegurar que los roles Cliente y Vendedor tengan acceso a las colecciones necesarias
      const targetRoles = await rolesService.readByQuery({
        filter: { name: { _in: ['Cliente', 'Vendedor'] } },
        limit: -1
      });

      // DEBUG: Check table structure
      const permColumns = await database('directus_permissions').columnInfo();
      console.log('[CRM-ANALYTICS] directus_permissions columns:', Object.keys(permColumns));
      
      const accessColumns = await database('directus_access').columnInfo();
      console.log('[CRM-ANALYTICS] directus_access columns:', Object.keys(accessColumns));

      const hasRole = Object.keys(permColumns).includes('role');
      const hasPolicy = Object.keys(permColumns).includes('policy');
      
      console.log(`[CRM-ANALYTICS] Schema detection: hasRole=${hasRole}, hasPolicy=${hasPolicy}`);

      const collectionsToGrant = ['lotes', 'pagos', 'ventas', 'clientes', 'vendedores', 'crm-analytics', 'mapa-lotes'];

      if (hasRole) {
          // OLD SCHEMA LOGIC
          // ...
      } else if (hasPolicy) {
          console.log('[CRM-ANALYTICS] Using Policy-based permissions (Directus 10.10+)...');
          
          // 1. Get Roles
          const targetRoles = await rolesService.readByQuery({
            filter: { name: { _in: ['Cliente', 'Vendedor', 'Public'] } }, // Include Public if it's a role
            limit: -1
          });
          
          // Note: Public "role" might not be in directus_roles in new versions, 
          // it's handled via a specific public policy usually? 
          // Or there is a public role with ID 'public' or null?
          // Let's check directus_roles names.
          
          for (const role of targetRoles) {
             console.log(`[CRM-ANALYTICS] Processing role: ${role.name} (${role.id})`);
             
             // Find policies for this role
             const accessRecords = await database('directus_access')
                .where({ role: role.id })
                .select('policy');
             
             for (const access of accessRecords) {
                 const policyId = access.policy;
                 console.log(`[CRM-ANALYTICS]   > Found Policy ID: ${policyId}`);
                 
                 for (const col of collectionsToGrant) {
                     const existingPerm = await database('directus_permissions')
                        .where({ policy: policyId, collection: col })
                        .first();
                     
                     if (!existingPerm) {
                         console.log(`[CRM-ANALYTICS]     > Granting READ on ${col} to Policy ${policyId}`);
                         await database('directus_permissions').insert({
                             policy: policyId,
                             collection: col,
                             action: 'read',
                             permissions: '{}',
                             validation: '{}',
                             fields: '*'
                         });
                     }
                 }
             }
          }
          
          // HANDLE PUBLIC ACCESS (Special Case)
          // In Directus 11, Public access is often controlled by a setting or a specific policy.
          // Usually there is a role with name 'Public' or ID 'public'?
          // Or we check `directus_settings` for `public_background`?
          // Let's assume there is a 'Public' role in the list above if it exists.
          // If not, we might need to find the "Public" policy.
          
          // Attempt to find Public Policy
           try {
             const policiesService = new ItemsService('directus_policies', { knex: database, schema, accountability: { admin: true } });
             const publicPolicy = await policiesService.readByQuery({
               filter: { name: { _eq: 'Public' } },
               limit: 1
             });

             if (publicPolicy.length > 0) {
               const policyId = publicPolicy[0].id;
               console.log(`[CRM-ANALYTICS] Found Public Policy: ${policyId}`);
               const publicCols = ['mapa-lotes', 'lotes']; // Public only needs map access usually
               
               for (const col of publicCols) {
                 const existingPerm = await database('directus_permissions')
                    .where({ policy: policyId, collection: col })
                    .first();
                 
                 if (!existingPerm) {
                     console.log(`[CRM-ANALYTICS]   > Granting READ on ${col} to Public Policy`);
                     await database('directus_permissions').insert({
                         policy: policyId,
                         collection: col,
                         action: 'read',
                         permissions: '{}',
                         validation: '{}',
                         fields: '*'
                     });
                 }
               }
             } else {
               console.log('[CRM-ANALYTICS] Public Policy not found by name "Public".');
             }
           } catch (err) {
             console.warn('[CRM-ANALYTICS] Error handling Public Policy:', err.message);
           }
       }

       /*
       // OLD LOGIC REMOVED
      const collectionsToGrant = ['lotes', 'pagos', 'ventas', 'clientes', 'vendedores', 'crm-analytics'];
      for (const role of targetRoles) {
        // ...
      }
      */
      
      console.log('[CRM-ANALYTICS] Permissions check complete.');
    } catch (err) {
      console.warn('[CRM-ANALYTICS] Auto-fix permissions failed:', err.message);
      if (err.stack) console.warn(err.stack);
    }
  })();

  router.get('/debug/permissions', async (req, res) => {
    try {
      const permissionsService = new ItemsService('directus_permissions', {
        schema: req.schema,
        knex: database,
      });
      const rolesService = new ItemsService('directus_roles', {
        schema: req.schema,
        knex: database,
      });

      const roles = await rolesService.readByQuery({ limit: -1 });
      const permissions = await permissionsService.readByQuery({ 
        limit: 50,
        sort: ['-id']
      });

      res.json({ roles, permissions });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/resumen', async (req, res) => {
    try {
      // Usamos Knex directamente para evitar overhead de ItemsService y problemas de parseo en agregaciones
      
      // 1. Total Ventas (Monto Total de ventas activas)
      const ventasResult = await database('ventas')
        .where('estatus', '!=', 'cancelada')
        .sum('monto_total as total')
        .count('* as count')
        .first();

      // 2. Total Pagos (Recaudado)
      const pagosResult = await database('pagos')
        .where('estatus', 'pagado')
        .sum('monto as total')
        .first();

      // 3. Lotes Disponibles
      const lotesResult = await database('lotes')
        .where('estatus', 'disponible')
        .count('* as count')
        .first();

      // 4. Clientes Activos (Total clientes)
      const clientesResult = await database('clientes')
        .count('* as count')
        .first();

      res.json({
        total_ventas: parseFloat(ventasResult?.total || 0),
        cantidad_ventas: parseInt(ventasResult?.count || 0),
        total_pagos: parseFloat(pagosResult?.total || 0),
        lotes_disponibles: parseInt(lotesResult?.count || 0),
        clientes_activos: parseInt(clientesResult?.count || 0)
      });

    } catch (error) {
      console.error('❌ Error en /resumen:', error);
      res.status(503).json({ error: error.message });
    }
  });

  router.get('/pagos-por-estatus', async (req, res) => {
    try {
      const resultados = await database('pagos')
        .select('estatus')
        .sum('monto as total')
        .count('* as cantidad')
        .groupBy('estatus');

      const data = resultados.map(r => ({
        estatus: r.estatus || 'desconocido',
        total: parseFloat(r.total || 0),
        cantidad: parseInt(r.cantidad || 0)
      }));

      res.json({ data });
    } catch (error) {
      console.error('❌ Error en /pagos-por-estatus:', error);
      res.status(503).json({ error: error.message });
    }
  });

  router.get('/lotes-por-estatus', async (req, res) => {
    try {
      // Usamos precio_lista como valor de referencia
      const resultados = await database('lotes')
        .select('estatus')
        .sum('precio_lista as total')
        .count('* as cantidad')
        .groupBy('estatus');

      const data = resultados.map(r => ({
        estatus: r.estatus || 'desconocido',
        total: parseFloat(r.total || 0),
        cantidad: parseInt(r.cantidad || 0)
      }));

      res.json({ data });
    } catch (error) {
      console.error('❌ Error en /lotes-por-estatus:', error);
      res.status(503).json({ error: error.message });
    }
  });

  router.get('/ventas-por-mes', async (req, res) => {
    try {
      const ventasService = getService('ventas', req);
      const ventas = await ventasService.readByQuery({
        fields: ['fecha_venta', 'monto_total'],
        filter: { estatus: { _neq: 'cancelada' } },
        limit: -1
      });

      const agrupado = ventas.reduce((acc, curr) => {
        if (!curr.fecha_venta) return acc;
        const mes = curr.fecha_venta.substring(0, 7); // YYYY-MM
        if (!acc[mes]) acc[mes] = { mes, total: 0, cantidad: 0 };
        acc[mes].total += parseFloat(curr.monto_total || 0);
        acc[mes].cantidad += 1;
        return acc;
      }, {});

      res.json({ data: Object.values(agrupado).sort((a, b) => a.mes.localeCompare(b.mes)) });
    } catch (error) {
      console.error('❌ Error en /ventas-por-mes:', error);
      res.status(503).json({ error: error.message });
    }
  });

  router.get('/ventas-por-vendedor', async (req, res) => {
    try {
      const ventasService = getService('ventas', req);
      const ventas = await ventasService.readByQuery({
        fields: ['monto_total', 'vendedor_id.nombre', 'vendedor_id.apellido_paterno'],
        filter: { estatus: { _neq: 'cancelada' } },
        limit: -1
      });

      const agrupado = ventas.reduce((acc, curr) => {
        const vendedor = curr.vendedor_id 
          ? `${curr.vendedor_id.nombre} ${curr.vendedor_id.apellido_paterno}`.trim()
          : 'Sin Asignar';
        
        if (!acc[vendedor]) acc[vendedor] = { vendedor, total: 0, cantidad: 0 };
        acc[vendedor].total += parseFloat(curr.monto_total || 0);
        acc[vendedor].cantidad += 1;
        return acc;
      }, {});

      res.json({ data: Object.values(agrupado) });
    } catch (error) {
      console.error('❌ Error en /ventas-por-vendedor:', error);
      res.status(503).json({ error: error.message });
    }
  });
};

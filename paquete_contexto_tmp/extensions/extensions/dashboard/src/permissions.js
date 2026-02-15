export const setupPermissions = async (services, database, getSchema) => {
  try {
    console.log('[CRM-ANALYTICS] Checking permissions...');

    const { ItemsService } = services;
    const schema = await getSchema();
    const rolesService = new ItemsService('directus_roles', {
      knex: database,
      schema,
      accountability: { admin: true },
    });

    // DEBUG: Check table structure
    const permColumns = await database('directus_permissions').columnInfo();
    // console.log('[CRM-ANALYTICS] directus_permissions columns:', Object.keys(permColumns));

    const accessColumns = await database('directus_access').columnInfo();
    // console.log('[CRM-ANALYTICS] directus_access columns:', Object.keys(accessColumns));

    const hasRole = Object.keys(permColumns).includes('role');
    const hasPolicy = Object.keys(permColumns).includes('policy');

    // console.log(`[CRM-ANALYTICS] Schema detection: hasRole=${hasRole}, hasPolicy=${hasPolicy}`);

    const collectionsToGrant = [
      'lotes',
      'pagos',
      'ventas',
      'clientes',
      'vendedores',
      'crm-analytics',
      'mapa-lotes',
    ];

    if (hasRole) {
      // OLD SCHEMA LOGIC (Not implemented in original file)
    } else if (hasPolicy) {
      console.log('[CRM-ANALYTICS] Using Policy-based permissions (Directus 10.10+)...');

      // 1. Get Roles
      const targetRoles = await rolesService.readByQuery({
        filter: { name: { _in: ['Cliente', 'Vendedor', 'Public'] } },
        limit: -1,
      });

      for (const role of targetRoles) {
        console.log(`[CRM-ANALYTICS] Processing role: ${role.name} (${role.id})`);

        // Find policies for this role
        const accessRecords = await database('directus_access')
          .where({ role: role.id })
          .select('policy');

        for (const access of accessRecords) {
          const policyId = access.policy;

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
                fields: '*',
              });
            }
          }
        }
      }

      // HANDLE PUBLIC ACCESS (Special Case)
      try {
        const policiesService = new ItemsService('directus_policies', {
          knex: database,
          schema,
          accountability: { admin: true },
        });
        const publicPolicy = await policiesService.readByQuery({
          filter: { name: { _eq: 'Public' } },
          limit: 1,
        });

        if (publicPolicy.length > 0) {
          const policyId = publicPolicy[0].id;
          const publicCols = ['mapa-lotes', 'lotes'];

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
                fields: '*',
              });
            }
          }
        }
      } catch (err) {
        console.warn('[CRM-ANALYTICS] Error handling Public Policy:', err.message);
      }
    }
  } catch (error) {
    console.error('[CRM-ANALYTICS] Error in setupPermissions:', error);
    throw error; // Re-throw for testing
  }
};

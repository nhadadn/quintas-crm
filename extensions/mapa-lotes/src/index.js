console.log('LOADING MAPA EXTENSION - ROOT INDEX.JS');

export default (router, { services, database, getSchema }) => {
  const { ItemsService } = services;

  console.log('✅ Endpoint /mapa-lotes registrado correctamente');

  router.get('/ping', (req, res) => res.send('pong'));

  // GET /mapa-lotes - Devuelve todos los lotes como GeoJSON
  router.get('/', async (req, res) => {
    try {
      console.log('📍 Petición recibida en /mapa-lotes');

      // Obtener schema
      const schema = await getSchema();

      // Crear servicio de lotes
      const lotesService = new ItemsService('lotes', {
        schema: schema,
        knex: database,
      });

      // Obtener todos los lotes
      const lotes = await lotesService.readByQuery({
        fields: ['*'],
        limit: -1,
      });

      console.log(`📊 Se encontraron ${lotes.length} lotes`);

      // Convertir a GeoJSON
      const features = lotes
        .map((lote) => {
          // Verificar que tenga geometría
          let geometry = null;

          if (lote.geometria) {
            try {
              geometry =
                typeof lote.geometria === 'string' ? JSON.parse(lote.geometria) : lote.geometria;
            } catch (e) {
              console.warn(`⚠️ Error parseando geometría del lote ${lote.id}:`, e);
            }
          }

          // Si no tiene geometría válida, crear un punto
          if (!geometry && lote.latitud && lote.longitud) {
            geometry = {
              type: 'Point',
              coordinates: [lote.longitud, lote.latitud],
            };
          }

          if (!geometry) {
            return null;
          }

          return {
            type: 'Feature',
            id: lote.id,
            properties: {
              id: lote.id,
              numero_lote: lote.numero_lote || '',
              zona: lote.zona || '',
              manzana: lote.manzana || '',
              area_m2: lote.area_m2 || 0,
              frente_m: lote.frente_m || 0,
              fondo_m: lote.fondo_m || 0,
              estatus: lote.estatus || 'disponible',
              precio_lista: lote.precio_lista || 0,
              topografia: lote.topografia || '',
              vista: lote.vista || '',
              cliente_id: lote.cliente_id || null,
              vendedor_id: lote.vendedor_id || null,
              notas: lote.notas || '',
              latitud: lote.latitud || 0,
              longitud: lote.longitud || 0,
              created_at: lote.date_created || new Date().toISOString(),
              updated_at: lote.date_updated || new Date().toISOString(),
            },
            geometry: geometry,
          };
        })
        .filter((feature) => feature !== null);

      const geoJSON = {
        type: 'FeatureCollection',
        features: features,
      };

      console.log(`✅ Devolviendo ${features.length} features en GeoJSON`);
      res.json(geoJSON);
    } catch (error) {
      console.error('❌ Error en endpoint /mapa-lotes:', error);
      res.status(503).json({ error: error.message });
    }
  });

  // GET /mapa-lotes/:id - Devuelve un lote específico
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const schema = await getSchema();
      const lotesService = new ItemsService('lotes', {
        schema: schema,
        knex: database,
      });

      const lote = await lotesService.readOne(id, {
        fields: ['*'],
      });

      if (!lote) {
        return res.status(404).json({
          error: 'Lote no encontrado',
        });
      }

      let geometry = null;

      if (lote.geometria) {
        try {
          geometry =
            typeof lote.geometria === 'string' ? JSON.parse(lote.geometria) : lote.geometria;
        } catch (e) {
          console.warn(`⚠️ Error parseando geometría del lote ${lote.id}:`, e);
        }
      }

      if (!geometry && lote.latitud && lote.longitud) {
        geometry = {
          type: 'Point',
          coordinates: [lote.longitud, lote.latitud],
        };
      }

      const feature = {
        type: 'Feature',
        id: lote.id,
        properties: {
          id: lote.id,
          numero_lote: lote.numero_lote || '',
          zona: lote.zona || '',
          manzana: lote.manzana || '',
          area_m2: lote.area_m2 || 0,
          frente_m: lote.frente_m || 0,
          fondo_m: lote.fondo_m || 0,
          estatus: lote.estatus || 'disponible',
          precio_lista: lote.precio_lista || 0,
          topografia: lote.topografia || '',
          vista: lote.vista || '',
          cliente_id: lote.cliente_id || null,
          vendedor_id: lote.vendedor_id || null,
          notas: lote.notas || '',
        },
        geometry: geometry,
      };

      res.json(feature);
    } catch (error) {
      console.error('❌ Error en endpoint /mapa-lotes/:id:', error);
      res.status(500).json({ error: error.message });
    }
  });
};

export default {
  id: 'svg-map',
  handler: (router, context) => {
    const { services, database } = context;
    const { ItemsService } = services;

    router.get('/', async (req, res) => {
      try {
        const lotesService = new ItemsService('lotes', { schema: req.schema, accountability: req.accountability });
        
        // Filtrar lotes que tienen un svg_path_id asignado
        const lotes = await lotesService.readByQuery({
          filter: {
            svg_path_id: {
              _nnull: true
            }
          },
          fields: ['*'],
          limit: -1
        });

        res.json(lotes);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.get('/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const lotesService = new ItemsService('lotes', { schema: req.schema, accountability: req.accountability });

        const lote = await lotesService.readOne(id, {
          fields: ['*']
        });

        if (!lote) {
          return res.status(404).json({ error: 'Lote no encontrado' });
        }

        res.json(lote);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }
};

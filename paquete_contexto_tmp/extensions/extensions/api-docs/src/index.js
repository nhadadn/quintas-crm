import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (router, context) => {
  // Definir opciones de Swagger
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Quintas de Otinapa ERP API',
        version: '1.0.0',
        description: 'API generada dinámicamente desde extensiones Directus',
      },
    },
    // Rutas a los archivos que contienen anotaciones
    apis: [
      path.resolve(__dirname, '../../lotes/src/index.js'),
      path.resolve(__dirname, '../../ventas-api/src/index.js'),
      path.resolve(__dirname, '../../../../api-spec/openapi.yaml'), // Intentar cargar YAML base si es soportado por jsdoc como input, si no, lo cargamos manual
    ],
  };

  // Cargar especificación base manualmente para asegurar merge
  try {
    const yamlPath = path.resolve(__dirname, '../../../../api-spec/openapi.yaml');
    if (fs.existsSync(yamlPath)) {
      const yamlContent = fs.readFileSync(yamlPath, 'utf8');
      const baseSpec = yaml.load(yamlContent);
      options.definition = { ...options.definition, ...baseSpec };
    }
  } catch (e) {
    console.warn('No se pudo cargar api-spec/openapi.yaml base:', e.message);
  }

  const specs = swaggerJsdoc(options);

  // Servir Swagger UI
  // NOTA: En Directus, los endpoints se montan en /<extension-name>
  // Así que esto estará en /api-docs

  // Directus router es un router de express.
  // swaggerUi.serve y setup necesitan ser manejados con cuidado en sub-rutas.

  router.use('/', swaggerUi.serve);
  router.get('/', swaggerUi.setup(specs));

  // Endpoint JSON crudo
  router.get('/json', (req, res) => {
    res.json(specs);
  });
};

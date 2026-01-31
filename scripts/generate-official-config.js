const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const svgPath = path.join(__dirname, '../frontend/public/mapas/mapa-oficial.svg');
const configPath = path.join(__dirname, '../frontend/public/mapas/scripts/frontend-config.json');

if (!fs.existsSync(svgPath)) {
  console.error('SVG file not found:', svgPath);
  process.exit(1);
}

const svgContent = fs.readFileSync(svgPath, 'utf-8');
const $ = cheerio.load(svgContent, { xmlMode: true });

const svg = $('svg');
const viewBox = svg.attr('viewBox');

const paths = [];

$('path').each((i, el) => {
  const $el = $(el);
  const id = $el.attr('id');
  const d = $el.attr('d');
  
  if (!d) return;

  // Determine type and interactivity
  let interactive = false;
  let type = 'decoration'; // default

  // Logic based on ID naming convention from the site
  // M-XXL-YY (Manzana XX Lote YY)
  if (id && id.match(/^M-\d+L-\d+/)) {
    interactive = true;
    type = 'lote';
  } else if (id && id.includes('Terreno')) {
    type = 'terreno';
  } else if (id && id.includes('Etapa')) {
    type = 'etapa';
  }

  paths.push({
    id: id || `path-${i}`,
    d: d,
    interactive: interactive,
    type: type,
    // Capture transform if present (though likely not needed for this clean SVG)
    transform: $el.attr('transform')
  });
});

const config = {
  svgSource: '/mapas/mapa-oficial.svg',
  viewBox: viewBox,
  paths: paths
};

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log(`Generated config with ${paths.length} paths.`);
console.log(`ViewBox: ${viewBox}`);

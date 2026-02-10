const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const SVG_PATH = path.join(__dirname, '../frontend/public/mapas/mapa-quintas.svg');
const OUTPUT_CONFIG = path.join(__dirname, '../frontend/public/mapas/scripts/frontend-config.json');

async function generateConfig() {
  console.log('Reading SVG...');
  if (!fs.existsSync(SVG_PATH)) {
    console.error('SVG file not found at:', SVG_PATH);
    process.exit(1);
  }

  const svgContent = fs.readFileSync(SVG_PATH, 'utf-8');
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(svgContent);

  const svg = result.svg;
  // Handle viewBox: ensure it exists. If not, use width/height.
  let viewBox = svg.$.viewBox;
  if (!viewBox && svg.$.width && svg.$.height) {
    viewBox = `0 0 ${svg.$.width} ${svg.$.height}`;
  }

  console.log(`ViewBox: ${viewBox}`);

  const paths = [];
  let pathCount = 0;

  const groupStats = {};

  function traverse(node, currentGroup = 'root') {
    // Check for group label
    let groupLabel = currentGroup;
    if (node.$ && (node.$['inkscape:label'] || node.$.id)) {
      groupLabel = node.$['inkscape:label'] || node.$.id;
    }

    if (node.path) {
      if (!groupStats[groupLabel]) groupStats[groupLabel] = 0;
      groupStats[groupLabel] += node.path.length;

      node.path.forEach((p) => {
        if (!p.$ || !p.$.d) return;

        const d = p.$.d;
        const transform = p.$.transform;
        const id = p.$.id || `path-${pathCount++}`;

        paths.push({
          id,
          d,
          transform,
          interactive: true,
          group: groupLabel, // Add group info to inspect
        });
      });
    }
    if (node.g) {
      node.g.forEach((g) => traverse(g, groupLabel));
    }
  }

  traverse(svg);

  console.log('Group Stats:', groupStats);

  // Filter paths
  const filteredPaths = paths.filter((p) => {
    // Exclude text and hatches
    if (p.group === 'CVL_CURV_TX') return false;
    if (p.group === 'hatches') return false;
    return true;
  });

  console.log(`Found ${paths.length} paths. Keeping ${filteredPaths.length}.`);

  const config = {
    svgSource: '/mapas/mapa-quintas.svg',
    viewBox,
    paths: filteredPaths.map(({ id, d, transform }) => ({ id, d, transform, interactive: true })),
  };

  // Ensure directory exists
  const dir = path.dirname(OUTPUT_CONFIG);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_CONFIG, JSON.stringify(config, null, 2));
  console.log(`Config written to ${OUTPUT_CONFIG}`);
}

generateConfig().catch(console.error);

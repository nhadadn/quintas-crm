import { promises as fs } from 'fs';
import path from 'path';

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p) {
  if (!(await pathExists(p))) {
    await fs.mkdir(p, { recursive: true });
  }
}

async function createWrapper(distDir, sourceRel) {
  const jsFile = path.join(distDir, 'index.js');
  const mjsFile = path.join(distDir, 'index.mjs');
  const content = `export { default } from "${sourceRel}";\n`;
  await fs.writeFile(jsFile, content, 'utf8');
  await fs.writeFile(mjsFile, content, 'utf8');
}

async function main() {
  const root = path.resolve(process.cwd(), 'extensions');
  const entries = await fs.readdir(root, { withFileTypes: true });

  for (const entry of entries) {
    try {
      if (!entry.isDirectory()) continue;
      const extRoot = path.join(root, entry.name);
      const pkgPath = path.join(extRoot, 'package.json');
      if (!(await pathExists(pkgPath))) continue;

      const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
      const dx = pkg['directus:extension'];
      if (!dx || !dx.path) continue;

      const distDir = path.join(extRoot, dx.path);
      await ensureDir(distDir);

      // Prefer source from manifest, fallback to src/index.js or index.js
      const source = dx.source || 'src/index.js';
      const sourceAbs = path.join(extRoot, source);
      const altSourceAbs = path.join(extRoot, 'index.js');

      let relImport;
      if (await pathExists(sourceAbs)) {
        relImport = path.relative(distDir, sourceAbs).replace(/\\/g, '/');
      } else if (await pathExists(altSourceAbs)) {
        relImport = path.relative(distDir, altSourceAbs).replace(/\\/g, '/');
      } else {
        console.warn(`No source file found for ${entry.name}, skipped`);
        continue;
      }

      await createWrapper(distDir, relImport.startsWith('.') ? relImport : `./${relImport}`);
      // Also write minimal package.json to assist resolvers if needed
      const distPkg = {
        type: 'module',
        main: 'index.js',
      };
      await fs.writeFile(
        path.join(distDir, 'package.json'),
        JSON.stringify(distPkg, null, 2),
        'utf8'
      );

      console.log(`✅ Built wrapper for ${entry.name} -> ${dx.path}`);
    } catch (err) {
      console.warn(`⚠️ Failed to build wrapper for ${entry.name}: ${err.message}`);
      continue;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const project = fileURLToPath(new URL('..', import.meta.url));
const outDir = '/private/tmp/portfolio-sculpture-audit';

// Explicit, separate entry and destination. npm run build still includes only
// the normal portfolio index.html; no diagnostic controls enter its bundle.
await build({
  configFile: false,
  root: project,
  base: '/',
  publicDir: false,
  plugins: [react()],
  build: {
    outDir,
    emptyOutDir: true,
    rolldownOptions: { input: path.join(project, 'scripts/hero-audit.html') },
  },
});
await copyFile(path.join(outDir, 'scripts/hero-audit.html'), path.join(outDir, 'index.html'));
console.log(`Isolated audit built at ${outDir}/index.html`);

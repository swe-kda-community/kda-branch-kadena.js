import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

function getWorkspaceDeps(): string[] {
  const pkg = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, './package.json'), 'utf-8'),
  ) as { dependencies?: Record<string, string> };
  return Object.keys(pkg.dependencies ?? {}).filter((k) =>
    pkg.dependencies![k].startsWith('workspace:'),
  );
}

const workspacePkgs = getWorkspaceDeps();
const workspacePkgsRegex = workspacePkgs.map(
  (p) => new RegExp(p.replace('@kadena/', '')),
);

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
  },
  server: {
    port: 5174,
    open: true,
  },
  optimizeDeps: {
    include: [...workspacePkgs, '@kadena/spirekey-sdk'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/, ...workspacePkgsRegex],
    },
  },
});

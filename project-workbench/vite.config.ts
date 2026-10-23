import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  root: fileURLToPath(new URL('.', import.meta.url)),
  server: { port: 5174 },
  preview: { port: 4176 },
  cacheDir: '../node_modules/.vite/workbench',
  resolve: {
    alias: {
      'framekit/devtools': fileURLToPath(new URL('../src/devtools.ts', import.meta.url)),
      framekit: fileURLToPath(new URL('../src/index.ts', import.meta.url)),
      ...Object.fromEntries(
        ['animation', 'elements', 'helpers', 'internal', 'modifiers', 'state', 'values'].map(
          (domain) => [`#${domain}`, fileURLToPath(new URL(`../src/${domain}`, import.meta.url))],
        ),
      ),
    },
  },
  build: { outDir: 'dist' },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['../src/__tests__/support/setup.ts'],
    sequence: { hooks: 'stack' },
  },
});

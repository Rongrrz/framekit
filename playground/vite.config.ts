import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  cacheDir: '../node_modules/.vite/playground',
  resolve: {
    alias: {
      framekit: fileURLToPath(new URL('../src/index.ts', import.meta.url)),
      '#animation': fileURLToPath(new URL('../src/animation', import.meta.url)),
      '#elements': fileURLToPath(new URL('../src/elements', import.meta.url)),
      '#helpers': fileURLToPath(new URL('../src/helpers', import.meta.url)),
      '#internal': fileURLToPath(new URL('../src/internal', import.meta.url)),
      '#modifiers': fileURLToPath(new URL('../src/modifiers', import.meta.url)),
      '#state': fileURLToPath(new URL('../src/state', import.meta.url)),
      '#values': fileURLToPath(new URL('../src/values', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        docs: fileURLToPath(new URL('index.html', import.meta.url)),
        workbench: fileURLToPath(new URL('workbench.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
  },
});

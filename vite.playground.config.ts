import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      framekit: fileURLToPath(new URL('src/index.ts', import.meta.url)),
    },
  },
  build: {
    outDir: 'playground-dist',
  },
});

import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      framekit: fileURLToPath(new URL('src/index.ts', import.meta.url)),
    },
  },
  test: { environment: 'happy-dom' },
});

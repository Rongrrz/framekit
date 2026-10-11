import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      framekit: fileURLToPath(new URL('../../src/index.ts', import.meta.url)),
      ...Object.fromEntries(
        ['animation', 'elements', 'helpers', 'internal', 'modifiers', 'state', 'values'].map(
          (domain) => [
            `#${domain}`,
            fileURLToPath(new URL(`../../src/${domain}`, import.meta.url)),
          ],
        ),
      ),
    },
  },
});

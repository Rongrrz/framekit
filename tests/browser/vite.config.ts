import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'mpa',
  plugins: [
    {
      name: 'playground-test-entry',
      transformIndexHtml: {
        order: 'pre',

        handler(html) {
          return html.replaceAll('src="/src/', 'src="/playground/src/');
        },
      },
    },
  ],
  resolve: {
    alias: {
      'framekit/devtools': fileURLToPath(new URL('../../src/devtools.ts', import.meta.url)),
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

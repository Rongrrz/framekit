import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    {
      name: 'workbench-test-entry',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          return html.replace(
            'src="/src/workbench/main.ts"',
            'src="/playground/src/workbench/main.ts"',
          );
        },
      },
    },
    {
      name: 'framekit-debug-route-test',
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          if (request.url?.split('?')[0]?.replace(/\/$/, '') === '/fkdebug') {
            request.url = '/playground/workbench.html';
          }
          next();
        });
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

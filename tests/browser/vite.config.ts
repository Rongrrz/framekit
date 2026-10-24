import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

import { codeExamples } from '../../project-landing/tooling/code-examples.ts';
import workbenchConfig from '../../project-workbench/vite.config.ts';

export default defineConfig({
  appType: 'mpa',
  optimizeDeps: {
    entries: [
      'tests/browser/index.html',
      'project-landing/index.html',
      'project-workbench/index.html',
    ],
  },
  plugins: [
    ...(workbenchConfig.plugins ?? []),
    codeExamples(),
    {
      name: 'project-landing-test-entry',
      transformIndexHtml: {
        order: 'pre',

        handler(html) {
          return html.replaceAll('src="/src/', 'src="/project-landing/src/');
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

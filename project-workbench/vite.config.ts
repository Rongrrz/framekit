import { fileURLToPath } from 'node:url';

import { build } from 'vite';
import { defineConfig } from 'vitest/config';

const config = defineConfig({
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

config.plugins = [
  {
    name: 'presentation-runtime',
    resolveId: (id) =>
      id === 'virtual:presentation-runtime' ? '\0presentation-runtime' : undefined,
    load: async (id) => {
      if (id !== '\0presentation-runtime') {
        return;
      }
      const result = await build({
        configFile: false,
        resolve: config.resolve!,
        logLevel: 'silent',
        build: {
          write: false,
          minify: true,
          lib: {
            entry: fileURLToPath(new URL('./src/presentation-runtime.ts', import.meta.url)),
            formats: ['iife'],
            name: 'FrameKitPresentation',
          },
        },
      });
      const output = Array.isArray(result)
        ? result[0]!.output
        : 'output' in result
          ? result.output
          : [];
      const chunk = output.find((entry) => entry.type === 'chunk');
      if (!chunk || chunk.type !== 'chunk') {
        throw new Error('Could not bundle presentation runtime.');
      }
      return `export default ${JSON.stringify(chunk.code)}`;
    },
  },
];

export default config;

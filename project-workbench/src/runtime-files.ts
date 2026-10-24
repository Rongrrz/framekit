import type { ProjectFile } from './project-export';

// This chunk is loaded only for project export; editable projects use public FrameKit imports.
const sources = import.meta.glob<string>(['../../src/**/*.ts', '!../../src/__tests__/**'], {
  eager: true,
  query: '?raw',
  import: 'default',
});

export const runtimeFiles: readonly ProjectFile[] = [
  {
    path: 'framekit/package.json',
    language: 'json',
    source: `${JSON.stringify(
      {
        name: 'framekit',
        version: '0.1.0',
        private: true,
        type: 'module',
        exports: { '.': './src/index.ts', './devtools': './src/devtools.ts' },
        imports: Object.fromEntries(
          ['animation', 'elements', 'helpers', 'internal', 'modifiers', 'state', 'values'].map(
            (domain) => [`#${domain}/*`, `./src/${domain}/*`],
          ),
        ),
      },
      null,
      2,
    )}\n`,
  },
  ...Object.entries(sources).map(([path, source]): ProjectFile => ({
    path: path.replace('../../src/', 'framekit/src/'),
    source,
    language: 'typescript',
  })),
];

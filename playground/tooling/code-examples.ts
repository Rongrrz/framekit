import { readFile } from 'node:fs/promises';

import type { Plugin } from 'vite';

import { prepareCode } from './code-formatting.ts';

const exampleQuery = '?example';

/** Each example is a watched module, so edits refresh the site and builds need no generated files. */
export const codeExamples = (): Plugin => ({
  name: 'framekit-code-examples',
  enforce: 'pre',

  async load(id) {
    if (!id.endsWith(exampleQuery)) {
      return;
    }

    const file = id.slice(0, -exampleQuery.length);
    this.addWatchFile(file);

    try {
      const source = await readFile(file, 'utf8');
      const example = await prepareCode(source, file);

      return `export default ${JSON.stringify(example)};`;
    } catch (error) {
      this.error(`Cannot prepare documentation example ${file}: ${String(error)}`);
    }
  },

  generateBundle(_options, bundle) {
    for (const output of Object.values(bundle)) {
      if (output.type !== 'chunk') {
        continue;
      }

      const tooling = Object.keys(output.modules).find((id) =>
        /[/\\]node_modules[/\\](?:prettier|shiki|@shikijs)[/\\]/.test(id),
      );

      if (tooling) {
        this.error(`Documentation tooling must stay in Node: ${tooling}`);
      }
    }
  },
});

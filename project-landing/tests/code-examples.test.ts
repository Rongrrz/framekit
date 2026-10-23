import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { build } from 'vite';
import { describe, expect, it } from 'vitest';

import { codeExamples } from '../tooling/code-examples';

const buildExample = async (source: string): Promise<Awaited<ReturnType<typeof build>>> => {
  const directory = await mkdtemp(join(tmpdir(), 'framekit-code-example-'));
  const entry = join(directory, 'index.js');

  try {
    await writeFile(entry, "export { default } from './example.ts?example';");
    await writeFile(join(directory, 'example.ts'), source);

    return await build({
      configFile: false,
      root: directory,
      plugins: [codeExamples()],
      logLevel: 'silent',
      build: { write: false, minify: false, lib: { entry, formats: ['es'] } },
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

describe('Vite example imports', () => {
  it('emits prepared code without browser formatting dependencies', async () => {
    const result = await buildExample('export const count=1;');
    const output = Array.isArray(result)
      ? result[0]!.output
      : 'output' in result
        ? result.output
        : [];
    const chunk = output.find((entry) => entry.type === 'chunk');

    expect(chunk?.type).toBe('chunk');

    if (chunk?.type !== 'chunk') {
      throw new Error('Expected an example module.');
    }

    expect(chunk.code).toContain('export const count = 1;');
    expect(Object.keys(chunk.modules)).not.toContainEqual(expect.stringMatching(/node_modules/));
  });

  it('fails with the example filename and a syntax diagnostic for invalid source', async () => {
    await expect(buildExample('export const = ;')).rejects.toThrow(
      /Cannot prepare documentation example .*example\.ts:/,
    );
  });
});

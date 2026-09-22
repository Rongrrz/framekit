import { execFileSync, spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const repository = fileURLToPath(new URL('../', import.meta.url));
const consumer = mkdtempSync(join(tmpdir(), 'framekit-consumer-'));
const fixture = readFileSync(join(repository, 'src/tests/public-api.typecheck.ts'), 'utf8').replace(
  "from '../index.js'",
  "from 'framekit'",
);

beforeAll(() => {
  execFileSync(
    'npm',
    [
      'pack',
      '--ignore-scripts',
      '--pack-destination',
      consumer,
      '--cache',
      join(consumer, 'npm-cache'),
    ],
    {
      cwd: repository,
      stdio: 'pipe',
    },
  );
  const packageDirectory = join(consumer, 'node_modules/framekit');
  mkdirSync(packageDirectory, { recursive: true });
  const archive = readdirSync(consumer).find((file) => file.endsWith('.tgz'));
  if (!archive) throw new Error('npm pack did not produce an archive.');
  execFileSync('tar', [
    '-xzf',
    join(consumer, archive),
    '--strip-components',
    '1',
    '-C',
    packageDirectory,
  ]);
  writeFileSync(join(consumer, 'contracts.mts'), fixture);
  writeFileSync(join(consumer, 'contracts.cts'), fixture);
  writeFileSync(
    join(consumer, 'invalid.mts'),
    fixture.replace(/^\s*\/\/ @ts-expect-error.*$/gm, ''),
  );
});

afterAll(() => rmSync(consumer, { recursive: true, force: true }));

describe('packed package consumers', () => {
  it.each(['module', 'commonjs'] as const)('loads named exports through %s', (format) => {
    const load =
      format === 'module'
        ? "const api = await import('framekit');"
        : "const api = require('framekit');";
    const output = execFileSync(
      process.execPath,
      [
        '--input-type',
        format,
        '-e',
        `${load}
      const value = api.createObservableValue(1);
      value.set(2);
      console.log(JSON.stringify({
        bindPopover: typeof api.bindPopover,
        bindTooltip: typeof api.bindTooltip,
        createSignalEmitter: typeof api.createSignalEmitter,
        installFrameKitStyles: typeof api.installFrameKitStyles,
        frame: typeof api.createFrame,
        spring: typeof api.spring,
        hover: typeof api.bindHoverScale,
        value: value.get(),
      }));`,
      ],
      { cwd: consumer, encoding: 'utf8' },
    );
    expect(JSON.parse(output)).toEqual({
      bindPopover: 'function',
      bindTooltip: 'function',
      createSignalEmitter: 'function',
      installFrameKitStyles: 'function',
      frame: 'function',
      spring: 'function',
      hover: 'function',
      value: 2,
    });
  });

  it.each([
    ['Bundler', 'ESNext', 'contracts.mts'],
    ['NodeNext', 'NodeNext', 'contracts.mts'],
    ['NodeNext', 'NodeNext', 'contracts.cts'],
  ])(
    'preserves positive and negative type contracts with %s (%s, %s)',
    (resolution, module, file) => {
      const compilation = compile(resolution, module, file);
      expect(compilation.stdout + compilation.stderr).toBe('');
      expect(compilation.status).toBe(0);
    },
  );

  it('rejects each invalid API call without expected-error directives', () => {
    const compilation = compile('NodeNext', 'NodeNext', 'invalid.mts');
    expect(compilation.status).toBe(2);
    expect(compilation.stdout.match(/error TS/g)).toHaveLength(
      fixture.match(/@ts-expect-error/g)?.length ?? 0,
    );
    expect(compilation.stdout).not.toMatch(/^node_modules\/framekit\/.*error TS/m);
  });
});

const compile = (resolution: string, module: string, file: string): SpawnSyncReturns<string> =>
  spawnSync(
    process.execPath,
    [
      join(repository, 'node_modules/typescript/bin/tsc'),
      '--ignoreConfig',
      '--noEmit',
      '--strict',
      '--skipLibCheck',
      'false',
      '--lib',
      'ES2022,DOM',
      '--moduleResolution',
      resolution,
      '--module',
      module,
      file,
    ],
    { cwd: consumer, encoding: 'utf8' },
  );

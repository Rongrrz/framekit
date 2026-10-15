import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { cpus, platform, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import { build, preview } from 'vite';

import { runLifecycleDiagnostic } from './lifecycle-run.mjs';
import { runResponsivenessDiagnostic } from './responsiveness-run.mjs';
import { runRuntimeDiagnostic } from './runtime-run.mjs';

const workloads = {
  lifecycle: runLifecycleDiagnostic,
  runtime: runRuntimeDiagnostic,
  responsiveness: runResponsivenessDiagnostic,
};

const directory = dirname(fileURLToPath(import.meta.url));
const repository = resolve(directory, '../..');
const mode = process.argv[2];
if (!Object.hasOwn(workloads, mode)) {
  throw new Error(
    'Usage: node benchmarks/diagnostics/run.mjs lifecycle|responsiveness|runtime [--out path] [--cpu-throttle 4] [--repetitions 5]',
  );
}
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
};
const repetitions = Number(option('--repetitions', '5'));
const throttle = Number(option('--cpu-throttle', mode === 'responsiveness' ? '4' : '1'));
assert.ok(
  [repetitions, throttle].every((value) => Number.isInteger(value) && value > 0),
  'Repetitions and CPU throttle must be positive integers.',
);
const output = resolve(option('--out', `test-results/diagnostics/${mode}.json`));
const git = (...args) => execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();
const revision = git('rev-parse', 'HEAD');
const workingTree = git('status', '--porcelain', '--', 'src', 'benchmarks/diagnostics');
const fingerprint = async () => {
  const hash = createHash('sha256');
  for (const root of ['src', 'benchmarks/diagnostics']) {
    for (const file of (await readdir(join(repository, root), { recursive: true })).sort()) {
      const path = join(repository, root, file);
      if (/\.(ts|mjs|html|css)$/.test(file) && (await stat(path)).isFile()) {
        hash
          .update(`${root}/${file}\0`)
          .update(await readFile(path))
          .update('\0');
      }
    }
  }
  return hash.digest('hex');
};
const sourceSha256 = await fingerprint();
const temporary = await mkdtemp(join(tmpdir(), 'framekit-diagnostics-'));
const configuration = {
  configFile: false,
  root: directory,
  logLevel: 'warn',
  resolve: {
    alias: {
      'framekit/devtools': join(repository, 'src/devtools.ts'),
      framekit: join(repository, 'src/index.ts'),
      ...Object.fromEntries(
        ['animation', 'elements', 'helpers', 'internal', 'modifiers', 'state', 'values'].map(
          (domain) => [`#${domain}`, join(repository, 'src', domain)],
        ),
      ),
    },
  },
  build: { outDir: temporary, emptyOutDir: true, minify: mode !== 'runtime' },
  preview: { host: '127.0.0.1', port: 0, strictPort: true },
};
let server;
let browser;
try {
  await build(configuration);
  assert.equal(
    await fingerprint(),
    sourceSha256,
    'Source changed during the production build; rerun for a coherent report.',
  );
  server = await preview(configuration);
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(() => Boolean(window.framekitDiagnostics));
  const results = await workloads[mode]({ page, client, repetitions, output });
  assert.deepEqual(errors, [], 'Browser reported errors.');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(
    output,
    `${JSON.stringify(
      {
        mode,
        measuredAt: new Date().toISOString(),
        revision,
        workingTree,
        sourceSha256,
        environment: {
          browser: browser.version(),
          cpu: cpus()[0]?.model,
          platform: platform(),
          cpuThrottle: throttle,
        },
        methodology: {
          production: true,
          minified: mode !== 'runtime',
          profiling:
            mode === 'runtime'
              ? 'Unminified production code, 100 microsecond CPU sampling; setup, verification, and GC outside recording. Timings include profiler overhead. Sample counts are not weighted CPU percentages.'
              : null,
          repetitions,
          warmupLifetimes: mode === 'lifecycle' ? 1 : 0,
          eventTiming:
            'Native keyboard/pointer PerformanceEventTiming: browser next-paint duration, quantized and thresholded at 16 ms; not an INP score.',
          presentationEstimate:
            'Event timestamp to second requestAnimationFrame; includes a rendering opportunity, not a precise paint timestamp.',
          memory:
            'Chromium JS heap and DOM/listener counters after two external full GCs. Weak references test sampled objects only; native/process memory is excluded.',
          timingThresholds: false,
        },
        results,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Saved ${output}`);
  assert.ok(
    results.passed,
    'Lifetime collection or native listener counts failed; inspect the saved report.',
  );
} finally {
  await browser?.close();
  if (server) {
    await new Promise((done, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : done())),
    );
  }
  await rm(temporary, { recursive: true, force: true });
}

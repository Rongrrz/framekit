import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, readFile, writeFile, mkdtemp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { arch, cpus, platform, tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import { build } from 'vite';

import { summarize, writeReport } from './report.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const repository = resolve(directory, '../..');
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
};
const baselineRef = option('--baseline', '13bbf6d');
const rounds = Number(option('--rounds', '3'));
const repetitions = Number(option('--repetitions', '7'));
const throttle = Number(option('--cpu-throttle', '1'));
const requestedCases = option('--cases', '').split(',').filter(Boolean);
const output = resolve(option('--out', join(directory, 'results.json')));
await mkdir(dirname(output), { recursive: true });
if (![rounds, repetitions, throttle].every((value) => Number.isInteger(value) && value > 0)) {
  throw new Error('Rounds, repetitions, and CPU throttle must be positive integers.');
}
const git = (...args) => execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();
const baselineRevision = git(
  'rev-parse',
  '--verify',
  '--end-of-options',
  `${baselineRef}^{commit}`,
);
const currentRevision = git('rev-parse', 'HEAD');
const libraryWorkingTree = git('status', '--porcelain', '--', 'src');
const temporary = await mkdtemp(join(tmpdir(), 'framekit-comparison-'));
const oldSource = join(temporary, 'source');
await mkdir(oldSource);
execFileSync('tar', ['-x', '-C', oldSource], {
  input: execFileSync('git', ['archive', baselineRevision, 'src'], {
    cwd: repository,
  }),
});
// Build the captured working source, so later edits cannot change an in-flight comparison.
const currentSource = join(temporary, 'current-source');
await cp(join(repository, 'src'), join(currentSource, 'src'), { recursive: true });
const sourceSha256 = Object.fromEntries(
  await Promise.all(
    [
      ['before', oldSource],
      ['current', currentSource],
    ].map(async ([variant, source]) => {
      const root = join(source, 'src');
      const hash = createHash('sha256');
      for (const file of (await readdir(root, { recursive: true })).sort()) {
        const path = join(root, file);
        if ((await stat(path)).isFile()) {
          hash
            .update(file)
            .update('\0')
            .update(await readFile(path))
            .update('\0');
        }
      }
      return [variant, hash.digest('hex')];
    }),
  ),
);
const directories = {};
for (const [variant, source] of [
  ['before', oldSource],
  ['current', currentSource],
]) {
  directories[variant] = join(temporary, variant);
  await build({
    configFile: false,
    root: directory,
    base: './',
    logLevel: 'warn',
    resolve: {
      alias: {
        framekit: join(source, 'src/index.ts'),
        ...Object.fromEntries(
          ['animation', 'elements', 'helpers', 'internal', 'modifiers', 'state', 'values'].map(
            (domain) => [`#${domain}`, join(source, 'src', domain)],
          ),
        ),
      },
    },
    build: { outDir: directories[variant], emptyOutDir: true, minify: true },
  });
}
const builtJavaScriptSha256 = Object.fromEntries(
  await Promise.all(
    Object.entries(directories).map(async ([variant, root]) => {
      const hash = createHash('sha256');
      for (const file of (await readdir(root, { recursive: true })).sort()) {
        if (file.endsWith('.js')) {
          hash.update(await readFile(join(root, file)));
        }
      }
      return [variant, hash.digest('hex')];
    }),
  ),
);
const server = createServer(async (request, response) => {
  try {
    const [, variant, ...parts] = new URL(request.url, 'http://localhost').pathname.split('/');
    const root = directories[variant];
    if (!root) {
      response.writeHead(404).end();
      return;
    }
    const path = resolve(root, decodeURIComponent(parts.join('/') || 'index.html'));
    if (!path.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    const content = await readFile(path);
    response
      .writeHead(200, {
        'content-type':
          {
            '.js': 'text/javascript',
            '.html': 'text/html',
            '.css': 'text/css',
          }[extname(path)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      })
      .end(content);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const port = server.address().port;
const browser = await chromium.launch();
const runs = [];
let definitions;
let environment;
const audits = {};
try {
  for (let round = 0; round < rounds; round += 1) {
    for (const variant of round % 2 ? ['current', 'before'] : ['before', 'current']) {
      const results = [];
      const runtimes =
        variant === 'before' ? ['framekit'] : ['framekit', 'react-root', 'react-local'];
      // Balance scheduling while giving both FrameKit versions the same page history.
      runtimes.push(...runtimes.splice(0, round % runtimes.length));
      for (const runtime of runtimes) {
        const page = await browser.newPage({
          viewport: { width: 1440, height: 900 },
        });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        if (throttle !== 1) {
          const client = await page.context().newCDPSession(page);
          await client.send('Emulation.setCPUThrottlingRate', {
            rate: throttle,
          });
        }
        await page.goto(`http://127.0.0.1:${port}/${variant}/index.html`);
        await page.waitForFunction(() => Boolean(window.runComparisonCase));
        definitions = await page.evaluate(() => window.comparisonCases);
        if (requestedCases.length > 0) {
          for (const id of requestedCases) {
            if (!definitions.some((definition) => definition.id === id)) {
              throw new Error(`Unknown benchmark case: ${id}`);
            }
          }
          definitions = definitions.filter((definition) => requestedCases.includes(definition.id));
        }
        environment = await page.evaluate(() => window.comparisonEnvironment);
        if (runtime === 'framekit') {
          audits[variant] = await page.evaluate(() => window.compatibilityAudit());
        }
        for (const definition of definitions) {
          const result = await page.evaluate(
            ({ id, runtime, repetitions }) => window.runComparisonCase(id, runtime, repetitions),
            { id: definition.id, runtime, repetitions },
          );
          results.push(result);
          console.log(
            `${round + 1}/${rounds} ${variant} ${definition.id} | ${runtime}: ${result.medianMs} ms`,
          );
        }
        if (errors.length) {
          throw new Error(errors.join('\n'));
        }
        await page.close();
      }
      runs.push({ round: round + 1, variant, results });
    }
  }
  const benchmarkHash = createHash('sha256');
  for (const file of ['fixtures.js', 'suite.js', 'run.mjs', 'report.mjs']) {
    benchmarkHash.update(await readFile(join(directory, file)));
  }
  const report = {
    measuredAt: new Date().toISOString(),
    baselineRevision,
    currentRevision,
    libraryWorkingTree,
    sourceSha256,
    builtJavaScriptSha256,
    benchmarkSha256: benchmarkHash.digest('hex'),
    environment: {
      ...environment,
      browser: browser.version(),
      cpu: cpus()[0]?.model,
      platform: platform(),
      arch: arch(),
      cpuThrottle: throttle,
    },
    methodology: {
      rounds,
      repetitions,
      warmups: 2,
      layout:
        'Geometry-changing cases force layout; hover cases measure subscriptions or dispatch.',
      includesPaint: false,
      reactCommit: 'one flushSync per complete operation',
      reactCompiler: false,
      runtimeIsolation: 'fresh page per version/runtime/round',
    },
    cases: definitions,
    audits,
    runs,
  };
  report.summary = summarize(report);
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  await writeReport(report, `${output.replace(/\.json$/, '')}.md`);
  console.log(`Saved ${output}`);
} finally {
  await browser.close();
  await new Promise((close) => server.close(close));
  await rm(temporary, { recursive: true, force: true });
}

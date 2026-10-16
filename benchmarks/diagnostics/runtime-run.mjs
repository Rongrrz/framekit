import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Isolate CPU recording from fixture setup and verification. */
export const runRuntimeDiagnostic = async ({ page, client, repetitions, output }) => {
  const profileDirectory = `${output.replace(/\.json$/, '')}-profiles`;
  await mkdir(profileDirectory, { recursive: true });

  const cases = [];
  await client.send('Profiler.enable');
  await client.send('Profiler.setSamplingInterval', { interval: 100 });

  for (const kind of ['patch', 'destroy', 'destroy-resources']) {
    await page.evaluate((kind) => {
      window.framekitDiagnostics.prepareRuntimeProfile(kind, 1000);
      window.framekitDiagnostics.runRuntimeProfile();
      window.framekitDiagnostics.verifyRuntimeProfile();
      window.framekitDiagnostics.disposeRuntimeProfile();
    }, kind);

    for (let index = 0; index < repetitions; index += 1) {
      const count = kind === 'patch' ? 1000 : 50_000;
      await page.evaluate(
        ({ kind, count }) => window.framekitDiagnostics.prepareRuntimeProfile(kind, count),
        { kind, count },
      );
      await client.send('HeapProfiler.collectGarbage');
      await client.send('Profiler.start');

      const timing = await page.evaluate(() => window.framekitDiagnostics.runRuntimeProfile());
      const { profile } = await client.send('Profiler.stop');
      await page.evaluate(() => {
        window.framekitDiagnostics.verifyRuntimeProfile();
        window.framekitDiagnostics.disposeRuntimeProfile();
      });

      const path = join(profileDirectory, `${kind}-${index + 1}.cpuprofile`);
      await writeFile(path, JSON.stringify(profile));

      const sampled = new Map();

      for (const id of profile.samples ?? []) {
        sampled.set(id, (sampled.get(id) ?? 0) + 1);
      }

      const topSamples = profile.nodes
        .map((node) => ({
          function: node.callFrame.functionName || '(anonymous)',
          line: node.callFrame.lineNumber + 1,
          samples: sampled.get(node.id) ?? 0,
        }))
        .filter((node) => node.samples > 0)
        .sort((left, right) => right.samples - left.samples)
        .slice(0, 20);

      cases.push({
        kind,
        round: index + 1,
        count,
        ...timing,
        totalSamples: profile.samples?.length ?? 0,
        topSamples,
        profile: path,
      });

      console.log(
        `${kind} ${index + 1}/${repetitions}: ${timing.elapsedMs.toFixed(2)} ms (instrumented)`,
      );
    }
  }

  return { cases, passed: true };
};

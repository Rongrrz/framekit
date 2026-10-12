import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { arch, cpus, platform } from 'node:os';

import { expect, test } from '@playwright/test';

import type {} from './harness.js';

test('records reproducible diagnostic workloads', async ({ page, browser }) => {
  await page.goto('/benchmarks/index.html');
  await page.waitForFunction(() => Boolean(window.runFrameKitBenchmarks));
  const results = await page.evaluate(() => window.runFrameKitBenchmarks());
  expect(results.remainingRoots).toBe(0);
  expect(results.virtualCollection.maxMountedViews).toBeLessThanOrEqual(15);
  writeFileSync(
    'benchmarks/baseline.json',
    `${JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
        environment: {
          browser: browser.version(),
          platform: platform(),
          arch: arch(),
          cpu: cpus()[0]?.model,
        },
        ...results,
      },
      null,
      2,
    )}\n`,
  );
});

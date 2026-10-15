import assert from 'node:assert/strict';

/** Drive native editing and wheel input through the production search application. */
export const runResponsivenessDiagnostic = async ({ page, repetitions }) => {
  await page.evaluate(() => window.framekitDiagnostics.startResponsiveness());
  const search = page.getByRole('textbox', { name: 'Filter records' });
  const list = page.getByRole('listbox', { name: 'Search results' });
  await search.focus();
  // Warm the same filtering and scrolling paths before retaining samples.
  await page.keyboard.type('amber');
  await page.getByRole('status').filter({ hasText: '50000 results' }).waitFor();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  const settle = () =>
    page.evaluate(
      () =>
        new Promise((done) =>
          requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 50))),
        ),
    );
  await settle();
  await page.evaluate(() => window.framekitDiagnostics.resetResponsiveness());
  const runs = [];
  for (let index = 0; index < repetitions; index += 1) {
    await search.focus();
    await page.keyboard.type('amber');
    await page.getByRole('status').filter({ hasText: '50000 results' }).waitFor();
    await list.hover();
    await page.mouse.wheel(0, 640);
    await page.waitForFunction(() => document.querySelector('[role="listbox"]').scrollTop > 0);
    await settle();
    await search.focus();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    await page.getByRole('status').filter({ hasText: '100000 results' }).waitFor();
    await settle();
    const sample = await page.evaluate(() => window.framekitDiagnostics.responsivenessSummary());
    assert.ok(sample.mountedViews <= 32, 'Virtualization exceeded the bounded DOM contract.');
    assert.ok(
      sample.samples.some((entry) => entry.kind === 'filter') &&
        sample.samples.some((entry) => entry.kind === 'scroll'),
      'Missing native input or scroll samples.',
    );
    runs.push(sample);
    await page.evaluate(() => window.framekitDiagnostics.resetResponsiveness());
    console.log(`Filter + scroll ${index + 1}/${repetitions} measured`);
  }
  const summary = (values) => {
    const sorted = values.toSorted((a, b) => a - b);
    return {
      count: sorted.length,
      medianMs: sorted[Math.floor(sorted.length / 2)] ?? null,
      p95Ms: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? null,
    };
  };
  const samples = runs.flatMap((run) => run.samples);
  return {
    runs,
    filteringPresentationEstimate: summary(
      samples
        .filter((sample) => sample.kind === 'filter')
        .map((sample) => sample.presentationEstimateMs),
    ),
    scrollingPresentationEstimate: summary(
      samples
        .filter((sample) => sample.kind === 'scroll')
        .map((sample) => sample.presentationEstimateMs),
    ),
    browserEventDuration: summary(
      runs
        .flatMap((run) => run.eventTimings)
        .filter((entry) => entry.interactionId > 0)
        .map((entry) => entry.duration),
    ),
    longTasks: summary(runs.flatMap((run) => run.longTasks)),
    passed: true,
  };
};

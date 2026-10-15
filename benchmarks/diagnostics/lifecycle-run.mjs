/** Repeated lifetimes and collectibility checks share one warmed browser page. */
export const runLifecycleDiagnostic = async ({ page, client, repetitions }) => {
  const collect = async () => {
    // Do not dereference WeakRefs in the job that asks V8 to collect their targets.
    await page.evaluate(() => new Promise((resolveTask) => setTimeout(resolveTask, 0)));
    await client.send('HeapProfiler.collectGarbage');
    await client.send('HeapProfiler.collectGarbage');
  };
  const counters = async () => ({
    ...(await client.send('Memory.getDOMCounters')),
    heap: await client.send('Runtime.getHeapUsage'),
  });
  await page.evaluate(() => window.framekitDiagnostics.runLifetime(false));
  await collect();
  const before = await counters();
  await page.evaluate(() => window.framekitDiagnostics.sampleDocuments());
  for (let index = 0; index < repetitions; index += 1) {
    await page.evaluate(() => window.framekitDiagnostics.runLifetime(true));
    console.log(`Lifetime ${index + 1}/${repetitions} destroyed`);
  }
  await collect();
  let collection = await page.evaluate(() => window.framekitDiagnostics.lifetimeSummary());
  for (let attempt = 0; attempt < 2 && collection.retained > 0; attempt += 1) {
    await collect();
    collection = await page.evaluate(() => window.framekitDiagnostics.lifetimeSummary());
  }
  const after = await counters();
  return {
    collection,
    before,
    after,
    listenerDelta: after.jsEventListeners - before.jsEventListeners,
    heapDeltaBytes: after.heap.usedSize - before.heap.usedSize,
    passed: collection.retained === 0 && after.jsEventListeners <= before.jsEventListeners,
  };
};

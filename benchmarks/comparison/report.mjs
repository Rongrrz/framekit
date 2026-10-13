import { writeFile } from 'node:fs/promises';

const median = (values) =>
  [...values].sort((left, right) => left - right)[Math.floor(values.length / 2)];
const rounded = (value) => Math.round(value * 1000) / 1000;

/** One statistical policy serves the table, chart, and machine-readable report. */
export function summarize(report) {
  return report.cases.map((definition) => {
    const stats = (variant, runtime) => {
      const results = report.runs
        .filter((run) => run.variant === variant)
        .flatMap((run) =>
          run.results.filter((result) => result.id === definition.id && result.runtime === runtime),
        );
      const samples = results
        .flatMap((result) => result.samples)
        .sort((left, right) => left - right);
      return {
        medianMs: rounded(median(results.map((result) => result.medianMs))),
        p95Ms: rounded(samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))]),
      };
    };
    return {
      ...definition,
      before: stats('before', 'framekit'),
      current: stats('current', 'framekit'),
      reactRoot: stats('current', 'react-root'),
      reactLocal: stats('current', 'react-local'),
    };
  });
}

export async function writeReport(report, path) {
  const summary = report.summary ?? summarize(report);
  const number = (value) => value.toFixed(1);
  const rows = summary.map(
    (entry) =>
      `| ${entry.label} | ${number(entry.before.medianMs)} | ${number(entry.current.medianMs)} | ${number(entry.reactRoot.medianMs)} | ${number(entry.reactLocal.medianMs)} |`,
  );
  await writeFile(
    path,
    `# Expanded FrameKit / React performance profile

Library source: ${report.currentRevision}. Baseline: ${report.baselineRevision}.
Measured: ${report.measuredAt}. ${report.environment.cpu}, Chromium ${report.environment.browser}, React ${report.environment.reactVersion}; production builds; CPU throttle ${report.environment.cpuThrottle}×.

All values below are **milliseconds; lower is better**. They are medians of ${report.methodology.rounds} round medians, each with ${report.methodology.repetitions} measured repetitions after two warmups. Raw samples and pooled p95 values are in the JSON report. Sub-millisecond values are coarse diagnostics, not precise speed ratios.

| Scenario | Before FK | Optimized FK | React root update | React local state |
| --- | ---: | ---: | ---: | ---: |
${rows.join('\n')}

## Main optimizations and compatibility

1. **Fixed-size text skips measurement.** Text that is unscaled or empty uses its configured font size before reading geometry. Nonempty scaled text still measures and responds to resize. This removes layout thrashing during ordinary label/control edits.
2. **Incremental insertion.** List/grid layouts produce shared placement styles and a sorting comparison. The renderer retains sorted child order, finds an inserted child's position by binary search, and applies only its styles and following ranks. Existing DOM nodes retain identity and focus.
3. **Incremental removal.** Detach, reparent, and individual destruction remove the child from rendered order, restore its own positioning, and update only following order declarations. Remaining layout is current before destruction callbacks run. Derived references are released on destruction.

Property writes and hierarchy edits remain synchronous. Layout settings, sort-key changes, explicit reorders, and rollback rebuild output. No batching API or deferred layout behavior is introduced. Focused tests cover immediate geometry, equal-key ordering, nested/composed layouts, failed placement, reentrant/failing cleanup, and surviving text selection.

The compatibility audit records the requested baseline's behavior:

| Observation | Before | Optimized |
| --- | --- | --- |
| Two untouched Frames share Size identity | ${report.audits.before.sharedDefaultSize} | ${report.audits.current.sharedDefaultSize} |
| Two untouched Frames share Position identity | ${report.audits.before.sharedDefaultPosition} | ${report.audits.current.sharedDefaultPosition} |
| Size and its axes are frozen | ${report.audits.before.frozenSize} | ${report.audits.current.frozenSize} |
| Assigning one Frame's Size leaves the other unchanged | ${report.audits.before.independentSizeAfterAssignment} | ${report.audits.current.independentSizeAfterAssignment} |
| Raw mouseenter listener registered before typed hover callback | ${report.audits.before.hoverOrderWhenRawSubscribedFirst.join(' → ')} | ${report.audits.current.hoverOrderWhenRawSubscribedFirst.join(' → ')} |

Default sharing and hover registration are unaffected by these three optimizations. Earlier allocation optimizations shared frozen defaults and made hover listeners lazy; choosing an older baseline can expose identity and raw/typed listener-order differences in the audit above.

## What the wider matrix reveals

- Sparse updates and keyed reversal are useful FrameKit cases. Construction, text-host rendering, and repeated subscribed lifetimes still have measurable overhead.
- **Text:** ordinary updates no longer force geometry reads. Scaled/wrapped fitting remains a separate, more expensive path that this ordinary-label case does not measure.
- **Live-layout edits:** these cases append to the tail and remove the final 100 rows in forward order. Incremental edits avoid full sibling reconciliation, but edits near the front still renumber following CSS ranks. These results do not imply constant-time arbitrary insertion/removal.
- **Transaction semantics:** React batches each requested operation into one commit; FrameKit commits each individual edit immediately. No-op writes also differ: FrameKit validates and publishes its internal write event, allowing assignment to interrupt an animation. React same-state local updates can bail out without rendering.

## Scope and reproduction

Run npm ci --prefix benchmarks/comparison, then node benchmarks/comparison/run.mjs. Use --cases <comma-separated-case-ids> for focused runs, --baseline <local-git-ref>, --rounds <n>, --repetitions <n>, --cpu-throttle <integer>, and --out <path.json> to vary the run. The baseline must exist locally. The runner builds the same benchmark against an exported Git source tree and the current source, alternates version/runtime order, checks observable results, and removes temporary builds after completion.

React root cases use keyed plain rows with one flushSync per complete operation. Local cases use per-row state. The observer and resource cases require per-row effects in both React variants. Text compares FrameKit TextLabel against an equivalent div/span rendering, not a recreation of all FrameKit text features. Hover delivery is programmatic native/synthetic event dispatch, not real pointer-to-paint latency. The manual three-setter case performs three synchronous FrameKit transactions; the React operation stays batched.

Geometry-changing cases force layout; hover cases measure subscription or dispatch work. Painting, hydration, network load, retained-memory leaks, mobile hardware, long-running animation, and full application responsiveness are outside this matrix. React Compiler is disabled. There are no hardware-dependent timing assertions in CI.
`,
  );
}

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

This run covers ${report.cases.length} scenarios. All values below are **milliseconds; lower is better**. They are medians of ${report.methodology.rounds} round medians, each with ${report.methodology.repetitions} measured repetitions after two warmups. Runtime isolation: ${report.methodology.runtimeIsolation ?? 'runtimes interleaved within each version page'}. Raw samples and pooled p95 values are in the JSON report. Sub-millisecond values are coarse diagnostics, not precise speed ratios.

| Scenario | Before FK | Optimized FK | React root update | React local state |
| --- | ---: | ---: | ---: | ---: |
${rows.join('\n')}

## Main optimizations and compatibility

The default baseline already includes the earlier text-sizing and incremental-layout optimizations. This change removes the remaining duplicate CSS-rank work:

1. **Sorted DOM owns placement.** List/grid layouts already sorted DOM nodes for reading and tab order. Arranged children now share neutral CSS order 0, letting that same DOM order determine visual placement.
2. **Edits leave survivors untouched.** Insertion applies placement rules only to the new child and moves it to the sorted DOM position. Removal restores only the departing child's own styles. The renderer no longer renumbers following siblings or allocates rank strings.
3. **Layer restoration remains intact.** Neutral CSS order overrides lower style owners while a layout is active; detaching the layout restores their values. LayoutOrder and Name still determine sorting, with explicit hierarchy order breaking ties.

Property writes and hierarchy edits remain synchronous. Layout settings, sort-key changes, explicit reorders, and rollback rebuild output. No batching API or deferred layout behavior is introduced. Focused tests cover immediate geometry, equal-key ordering, nested/composed layouts, failed placement, reentrant/failing cleanup, and surviving text selection in Chromium, Firefox, and WebKit. Focused cases also verify that front edits do not mutate surviving row attributes.

The compatibility audit records the requested baseline's behavior:

| Observation | Before | Optimized |
| --- | --- | --- |
| Two untouched Frames share Size identity | ${report.audits.before.sharedDefaultSize} | ${report.audits.current.sharedDefaultSize} |
| Two untouched Frames share Position identity | ${report.audits.before.sharedDefaultPosition} | ${report.audits.current.sharedDefaultPosition} |
| Size and its axes are frozen | ${report.audits.before.frozenSize} | ${report.audits.current.frozenSize} |
| Assigning one Frame's Size leaves the other unchanged | ${report.audits.before.independentSizeAfterAssignment} | ${report.audits.current.independentSizeAfterAssignment} |
| Raw mouseenter listener registered before typed hover callback | ${report.audits.before.hoverOrderWhenRawSubscribedFirst.join(' → ')} | ${report.audits.current.hoverOrderWhenRawSubscribedFirst.join(' → ')} |
| Inline CSS orders for a later/earlier pair | ${report.audits.before.layoutCssOrders?.join(', ') ?? 'not recorded'} | ${report.audits.current.layoutCssOrders?.join(', ') ?? 'not recorded'} |
| Earlier child is first in sorted DOM order | ${report.audits.before.sortedDomOrder ?? 'not recorded'} | ${report.audits.current.sortedDomOrder ?? 'not recorded'} |

Inline CSS order is an observable implementation change: consumers inspecting unsafeElement now see 0 instead of a sequential rank. Public LayoutOrder values, visual/DOM/tab sorting, and synchronous geometry are preserved. Native scroll anchoring remains enabled; focused content can stay stationary as the browser adjusts its scroll position.

Default sharing and hover registration are unaffected by this optimization. Earlier allocation optimizations shared frozen defaults and made hover listeners lazy; choosing an older baseline can expose identity and raw/typed listener-order differences in the audit above.

## What the wider matrix reveals

- Sparse updates and keyed reversal are useful FrameKit cases. Construction, text-host rendering, and repeated subscribed lifetimes still have measurable overhead.
- **Text:** ordinary updates no longer force geometry reads. Scaled/wrapped fitting remains a separate, more expensive path that this ordinary-label case does not measure.
- **Live-layout edits:** the matrix measures both ends. Tail removal destroys the final 100 rows in forward order; front removal destroys the first 100 in forward order. Prepending assigns new FrameKit rows LayoutOrder -1 ahead of the existing rows at 0; React prepends keyed DOM rows in one commit. FrameKit and React now both rely on sorted DOM order for placement. FrameKit still commits individual edits immediately and splices its hierarchy and rendered-order arrays, while React batches the operation. These cases do not imply constant-time arbitrary insertion/removal.
- **Transaction semantics:** React batches each requested operation into one commit; FrameKit commits each individual edit immediately. No-op writes also differ: FrameKit validates and publishes its internal write event, allowing assignment to interrupt an animation. React same-state local updates can bail out without rendering.

## Scope and reproduction

Run npm ci --prefix benchmarks/comparison, then node benchmarks/comparison/run.mjs. Use --cases <comma-separated-case-ids> for focused runs, --baseline <local-git-ref>, --rounds <n>, --repetitions <n>, --cpu-throttle <integer>, and --out <path.json> to vary the run. The baseline must exist locally. The runner builds the same benchmark against an exported Git source tree and the current source, alternates version order and rotates runtime scheduling, checks observable results, and removes temporary builds after completion. Each runtime gets a fresh page per round so React activity cannot change FrameKit's page history. Only the FrameKit pages run the compatibility audit, identically for both versions. Process scheduling and system load can still affect timings.

React root cases use keyed plain rows with one flushSync per complete operation. Local cases use per-row state. The observer and resource cases require per-row effects in both React variants. Text compares FrameKit TextLabel against an equivalent div/span rendering, not a recreation of all FrameKit text features. Hover delivery is programmatic native/synthetic event dispatch, not real pointer-to-paint latency. The manual three-setter case performs three synchronous FrameKit transactions; the React operation stays batched.

Geometry-changing cases force layout; hover cases measure subscription or dispatch work. Painting, hydration, network load, retained-memory leaks, mobile hardware, long-running animation, and full application responsiveness are outside this matrix. React Compiler is disabled. There are no hardware-dependent timing assertions in CI.
`,
  );
}

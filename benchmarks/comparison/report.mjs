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

1. **Lazy hover connections.** Unused Frames no longer allocate hover listeners and AbortControllers. First subscription connects one native bridge for that event; callback disposal and node destruction still release subscriptions. After early unsubscribe, the bridge stays owned until node destruction, as before.
2. **Shared accessors and defaults.** Nodes reuse property accessor functions and deeply immutable default values. Assigning a property still updates only that node. Equal default values can now have shared object identity across nodes; code that compares defaults with strict equality can observe this.
3. **Weakly cached immutable snapshots.** Only fully frozen data graphs without enumerable accessors are cached. Mutable children, accessor-backed values, and cycles containing mutable data remain independently snapshotted. Weak caching does not keep the values alive by itself.
4. **Less work per property transaction.** A direct setter snapshots its value rather than its private one-field wrapper. Validation and commit reuse one proposed record. Base GUI validation checks the written fields, while modifier relationship checks still receive the complete proposed state. Atomic patches, rollback, notifications, and no-op animation interruption remain covered by tests.
5. **Less empty rendering/style work.** Nodes with no modifiers skip empty modifier reconciliation. Style layers avoid intermediate entry pairs and union Sets, retain precedence, and restore the next style owner when an override disappears.

The audit confirms these observable differences:

| Observation | Before | Optimized |
| --- | --- | --- |
| Two untouched Frames share Size identity | ${report.audits.before.sharedDefaultSize} | ${report.audits.current.sharedDefaultSize} |
| Two untouched Frames share Position identity | ${report.audits.before.sharedDefaultPosition} | ${report.audits.current.sharedDefaultPosition} |
| Size and its axes are frozen | ${report.audits.before.frozenSize} | ${report.audits.current.frozenSize} |
| Assigning one Frame's Size leaves the other unchanged | ${report.audits.before.independentSizeAfterAssignment} | ${report.audits.current.independentSizeAfterAssignment} |
| Raw mouseenter listener registered before typed hover callback | ${report.audits.before.hoverOrderWhenRawSubscribedFirst.join(' → ')} | ${report.audits.current.hoverOrderWhenRawSubscribedFirst.join(' → ')} |

The ordering difference matters if raw listeners use stopImmediatePropagation or depend on typed callbacks running first. Because change notifications use Object.is, assigning another instance's now-shared default can also suppress a notification that previously occurred for a distinct but equal-valued object. No public API was removed and property writes remain synchronous, but this is not a claim of zero observable differences.

## What the wider matrix reveals

- Sparse updates and keyed reversal are useful FrameKit cases. Dense creation/update and repeated subscribed lifetimes still carry measurable overhead.
- **Text updates remain expensive.** renderTextSize reads clientWidth/clientHeight before checking TextScaled. Updating ordinary text therefore interleaves DOM writes with geometry reads even when scaling is disabled. This existed before the optimization commit and is a concrete next profiling/fix target.
- **Live-layout insertion/removal is expensive.** Each Parent assignment or individual destroy recomputes the active parent layout. The React comparison batches the entire requested addition/removal into one commit. FrameKit's immediate intermediate layout contract is included in its cost; this is an intentional API-semantics difference, not a feature-equivalent batching comparison.
- No-op writes are not identical contracts: FrameKit still validates and publishes its internal write event, allowing a direct assignment to interrupt an animation. React same-state local updates can bail out without rendering.

## Scope and reproduction

Run npm ci --prefix benchmarks/comparison, then node benchmarks/comparison/run.mjs. Use --baseline <local-git-ref>, --rounds <n>, --repetitions <n>, --cpu-throttle <integer>, and --out <path.json> to vary the run. The baseline must exist locally. The runner builds the same benchmark against an exported Git source tree and the current source, alternates version/runtime order, checks observable results, and removes temporary builds after completion.

React root cases use keyed plain rows with one flushSync per complete operation. Local cases use per-row state. The observer and resource cases require per-row effects in both React variants. Text compares FrameKit TextLabel against an equivalent div/span rendering, not a recreation of all FrameKit text features. Hover delivery is programmatic native/synthetic event dispatch, not real pointer-to-paint latency. The manual three-setter case performs three synchronous FrameKit transactions; the React operation stays batched.

Geometry-changing cases force layout; hover cases measure subscription or dispatch work. Painting, hydration, network load, retained-memory leaks, mobile hardware, long-running animation, and full application responsiveness are outside this matrix. React Compiler is disabled. There are no hardware-dependent timing assertions in CI.
`,
  );
}

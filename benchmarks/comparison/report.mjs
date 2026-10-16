import { writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

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

/** Reports only measured facts; interpretation of a particular change belongs in its audit. */
export async function writeReport(report, path) {
  const summary = report.summary ?? summarize(report);
  const number = (value) => value.toFixed(1);

  const rows = summary.map((entry) => {
    const change =
      entry.before.medianMs > 0
        ? rounded(100 * (entry.current.medianMs / entry.before.medianMs - 1))
        : undefined;

    const percentage = change === undefined ? '—' : `${change >= 0 ? '+' : ''}${number(change)}%`;

    return `| ${entry.label} | ${number(entry.before.medianMs)} | ${number(entry.current.medianMs)} | ${percentage} | ${number(entry.before.p95Ms)} → ${number(entry.current.p95Ms)} | ${number(entry.reactRoot.medianMs)} | ${number(entry.reactLocal.medianMs)} |`;
  });

  const samplesFile = basename(path.replace(/\.md$/, '.json'));

  const sourceState = report.libraryWorkingTree
    ? `Uncommitted library changes were included:\n\n\`\`\`text\n${report.libraryWorkingTree}\n\`\`\``
    : 'The library source tree was clean.';

  await writeFile(
    path,
    `# FrameKit / React performance comparison

Current source HEAD: \`${report.currentRevision}\`. Baseline: \`${report.baselineRevision}\`.
${sourceState}

Captured source SHA-256: before ${report.sourceSha256?.before ?? 'not recorded'}; current ${report.sourceSha256?.current ?? 'not recorded'}.

Measured ${report.measuredAt}. ${report.environment.cpu}, production Chromium ${report.environment.browser}, React ${report.environment.reactVersion}; CPU throttle ${report.environment.cpuThrottle}×.

## Timings

This run covers ${report.cases.length} scenarios. Milliseconds, lower is better. Medians are the median of ${report.methodology.rounds} round medians, each with ${report.methodology.repetitions} measured repetitions after ${report.methodology.warmups} warmups. p95 pools the measured samples. Negative changes mean less elapsed time, not increased throughput. Small timings and tails are noisy diagnostics, not confidence intervals or full-application rankings.

| Scenario | Before FK | Current FK | Median change | p95 before → current | React root | React local |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${rows.join('\n')}

## Observed compatibility

These observations come from the fixture audit. They compare the requested versions and do not establish complete API compatibility.

| Observation | Before | Current |
| --- | --- | --- |
| Untouched Frames share Size identity | ${report.audits.before.sharedDefaultSize} | ${report.audits.current.sharedDefaultSize} |
| Untouched Frames share Position identity | ${report.audits.before.sharedDefaultPosition} | ${report.audits.current.sharedDefaultPosition} |
| Size and its axes are frozen | ${report.audits.before.frozenSize} | ${report.audits.current.frozenSize} |
| Assigning one Size leaves the other unchanged | ${report.audits.before.independentSizeAfterAssignment} | ${report.audits.current.independentSizeAfterAssignment} |
| Hover listener order when raw subscription comes first | ${report.audits.before.hoverOrderWhenRawSubscribedFirst.join(' → ')} | ${report.audits.current.hoverOrderWhenRawSubscribedFirst.join(' → ')} |
| Inline CSS order for a later/earlier pair | ${report.audits.before.layoutCssOrders?.join(', ') ?? 'not recorded'} | ${report.audits.current.layoutCssOrders?.join(', ') ?? 'not recorded'} |
| Earlier child is first in sorted DOM order | ${report.audits.before.sortedDomOrder ?? 'not recorded'} | ${report.audits.current.sortedDomOrder ?? 'not recorded'} |

## Measurement contracts

- Runtime isolation: ${report.methodology.runtimeIsolation}. Version order alternates and runtime scheduling rotates. Process scheduling and system load still affect timing.
- React root renders keyed rows from root state; React local uses per-row state. React receives ${report.methodology.reactCommit}. Observer/resource cases use per-row effects in both variants. FrameKit commits each property or hierarchy edit synchronously.
- FrameKit no-op writes still validate and publish write events, allowing same-value assignments to interrupt animations. React local same-state updates can bail out without rendering.
- Ordinary text compares FrameKit TextLabel with an equivalent div/span. Scaled/wrapped fitting and all text features are not reproduced.
- Prepending places keyed rows before existing rows; FrameKit assigns the new rows LayoutOrder -1. Front and tail removal destroy the respective 100 rows in forward order. Immediate FrameKit edits still splice hierarchy/render-order arrays; these timings do not imply constant-time edits.
- Hover compares programmatic native/synthetic event dispatch, not real pointer-to-paint latency.
- ${report.methodology.layout} Includes paint: ${report.methodology.includesPaint}. React Compiler: ${report.methodology.reactCompiler}.

Hydration, network, retained-memory leaks, mobile hardware, and full application responsiveness are outside this matrix. No hardware-dependent timing thresholds run in CI. Raw samples, environment, revisions, audits, and the harness fingerprint are in [${samplesFile}](${samplesFile}).

## Reproduction

From the repository root, with the benchmark dependencies and Playwright Chromium installed:

\`\`\`sh
node benchmarks/comparison/run.mjs --baseline ${report.baselineRevision} --rounds ${report.methodology.rounds} --repetitions ${report.methodology.repetitions} --cpu-throttle ${report.environment.cpuThrottle} --cases ${report.cases.map((entry) => entry.id).join(',')} --out /tmp/comparison.json
\`\`\`

To repeat the same current source, check out its recorded revision and restore any recorded uncommitted changes. Use --cases for a comma-separated subset and --cpu-throttle for a positive integer throttle. The baseline must exist locally. The runner builds both sources in production mode, checks observable fixture results, and removes temporary builds when finished. This report does not attribute each timing difference to a particular code change.
`,
  );
}

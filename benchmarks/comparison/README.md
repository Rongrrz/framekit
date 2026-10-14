# Expanded production comparison

The latest [follow-up results](followup-results.md) and [chart](followup-comparison.png) compare
the text/style improvements with `a48fd64`, the starting point for that work. They include the
profiling findings, rejected experiments, all 23 cases, and changes in median and p95 timings.
The earlier DOM-order [regression audit](regression.md) remains a separate historical report.

This isolated package compares FrameKit with pinned React 19.3.0 without adding React to the
library or Playground dependencies. It measures 23 scenarios: bulk creation, sparse/dense/no-op
writes, grouped patches, text, modifiers, observers, keyed reversal, live-layout insertion/removal at both ends,
hover, subscribed teardown, and repeated lifetimes.

Run from the repository root with its development dependencies and Playwright Chromium installed.

```sh
npm ci --prefix benchmarks/comparison
node benchmarks/comparison/run.mjs
```

The runner builds both versions in production mode, serves them on an ephemeral local port,
uses a fresh page per version/runtime/round to keep FrameKit's page history matched,
checks geometry/identity/notifications/cleanup, and writes [results.json](results.json) and
[results.md](results.md). The default baseline is `13bbf6d`, immediately before the DOM-order optimization. It already
includes the earlier text and incremental-layout optimizations. It must be present in local Git history. Useful options:

```sh
node benchmarks/comparison/run.mjs --baseline 13bbf6d --rounds 5 --repetitions 11
node benchmarks/comparison/run.mjs --cpu-throttle 4 --out /tmp/comparison.json
node benchmarks/comparison/run.mjs --cases prepend-100,remove-front-100 --out /tmp/front-edits.json
```

The reports explain the differences between React root updates and per-row state, immediate
FrameKit layout updates and batched React commits, and FrameKit native versus React synthetic
hover delivery. Timings include layout where relevant and exclude paint. They are diagnostics,
not CI timing budgets or full-application rankings.

To regenerate the standalone chart with Python and Matplotlib:

```sh
python3 benchmarks/comparison/plot.py benchmarks/comparison/results.json \
  --output benchmarks/comparison/comparison
```

![Expanded benchmark comparison](comparison.png)

The matrix intentionally retains unfavorable cases and measures edits at both ends of a list.
Prepending gives new FrameKit rows LayoutOrder -1 ahead of existing rows at 0; React prepends the
keyed rows in one commit. Both now use sorted DOM order for placement. FrameKit keeps arranged
children at CSS order 0 and leaves surviving row attributes unchanged during insertion/removal.
Its edits remain synchronous and still splice hierarchy/render-order arrays; they are not
constant-time operations. Changes to sorting, layout settings, or explicit child order rebuild
FrameKit layout output. Construction, text rendering, and repeated lifetimes
still include FrameKit feature overhead. See the report for measured differences and limitations.

See [the regression audit](regression.md) for all before/after median and p95 changes,
the identical-source controls, and the investigation of the earlier mixed-runtime results.

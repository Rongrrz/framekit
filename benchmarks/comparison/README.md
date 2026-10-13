# Expanded production comparison

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
checks geometry/identity/notifications/cleanup, and writes [results.json](results.json) and
[results.md](results.md). The default baseline is `846fd1c`, immediately before the text and incremental-layout
optimizations. It must be present in local Git history. Useful options:

```sh
node benchmarks/comparison/run.mjs --baseline 846fd1c --rounds 5 --repetitions 11
node benchmarks/comparison/run.mjs --cpu-throttle 4 --out /tmp/comparison.json
node benchmarks/comparison/run.mjs --cases text --baseline 846fd1c --out /tmp/text.json
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
keyed rows in one commit. FrameKit synchronously updates following CSS ranks after each insertion
or removal, while React uses keyed DOM order. Changes to sorting, layout settings, or explicit child
order rebuild FrameKit layout output. Construction, text rendering, and repeated lifetimes
still include FrameKit feature overhead. See the report for measured differences and limitations.

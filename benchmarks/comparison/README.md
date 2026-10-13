# Expanded production comparison

This isolated package compares FrameKit with pinned React 19.3.0 without adding React to the
library or Playground dependencies. It measures 21 scenarios: bulk creation, sparse/dense/no-op
writes, grouped patches, text, modifiers, observers, keyed reversal, live-layout insertion/removal,
hover, subscribed teardown, and repeated lifetimes.

Run from the repository root with its development dependencies and Playwright Chromium installed.

```sh
npm ci --prefix benchmarks/comparison
node benchmarks/comparison/run.mjs
```

The runner builds both versions in production mode, serves them on an ephemeral local port,
checks geometry/identity/notifications/cleanup, and writes [results.json](results.json) and
[results.md](results.md). The default baseline is `999410f`, immediately before the runtime
optimizations. It must be present in local Git history. Useful options:

```sh
node benchmarks/comparison/run.mjs --baseline 999410f --rounds 3 --repetitions 7
node benchmarks/comparison/run.mjs --cpu-throttle 4 --out /tmp/comparison.json
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

The matrix intentionally retains unfavorable cases. Current priorities include avoidable geometry
reads in unscaled text updates and repeated full-layout work during live-list insertion/removal.

# Expanded FrameKit / React performance profile

Library source: d156913a9e8702f608bacc310c1541304e48cceb. Baseline: 846fd1c58e29c3373dfb8daf70f1c0ef60a4059b.
Measured: 2026-10-13T19:06:39.357Z. Apple M5, Chromium 156.0.8078.4, React 19.3.0; production builds; CPU throttle 1×.

All values below are **milliseconds; lower is better**. They are medians of 3 round medians, each with 7 measured repetitions after two warmups. Raw samples and pooled p95 values are in the JSON report. Sub-millisecond values are coarse diagnostics, not precise speed ratios.

| Scenario                                | Before FK | Optimized FK | React root update | React local state |
| --------------------------------------- | --------: | -----------: | ----------------: | ----------------: |
| Create 1,000 rows                       |       7.9 |          8.2 |               4.1 |               4.9 |
| Create 5,000 rows                       |      37.2 |         36.4 |              32.2 |              33.3 |
| Rotate 1 of 5,000 rows                  |       0.3 |          0.2 |               2.8 |               0.7 |
| Rotate 10 of 5,000 rows                 |       0.3 |          0.3 |               3.0 |               0.6 |
| Rotate 500 of 5,000 rows                |       1.3 |          1.5 |               3.3 |               1.9 |
| Rotate 5,000 of 5,000 rows              |       7.8 |          8.2 |               6.6 |               7.8 |
| 5,000 no-op writes                      |       0.8 |          1.1 |               2.5 |               0.9 |
| Three-property patch × 1,000            |       3.8 |          3.8 |               2.9 |               3.5 |
| Three direct setters × 1,000            |       3.9 |          3.7 |               2.8 |               3.3 |
| Update 1,000 text labels                |      66.8 |          5.9 |               3.4 |               3.6 |
| Update 1,000 corner modifiers           |       2.3 |          2.6 |               2.2 |               3.1 |
| 1,000 writes + committed-DOM observers  |       2.6 |          2.7 |               2.7 |               2.9 |
| Reverse 5,000 keyed rows                |      13.6 |         12.5 |              27.6 |              52.2 |
| Append 10 to a live 1,000-row layout    |       6.0 |          0.5 |               0.8 |               1.1 |
| Append 100 to a live 1,000-row layout   |      55.3 |          1.1 |               1.1 |               1.4 |
| Remove 100 from a live 1,100-row layout |      71.1 |          1.3 |               0.8 |               1.1 |
| Subscribe 1,000 hover targets           |       0.5 |          0.5 |               0.5 |               0.7 |
| Deliver 1,000 hover events              |       1.2 |          1.6 |               4.9 |               4.2 |
| Destroy 5,000 plain rows                |       2.0 |          1.8 |               1.0 |               1.3 |
| Destroy 1,000 subscribed hover targets  |       0.6 |          0.7 |               0.4 |               0.4 |
| 20 lifetimes × 100 subscribed rows      |      18.7 |         18.4 |               8.6 |               8.8 |

## Main optimizations and compatibility

1. **Fixed-size text skips measurement.** Text that is unscaled or empty uses its configured font size before reading geometry. Nonempty scaled text still measures and responds to resize. This removes layout thrashing during ordinary label/control edits.
2. **Incremental insertion.** List/grid layouts produce shared placement styles and a sorting comparison. The renderer retains sorted child order, finds an inserted child's position by binary search, and applies only its styles and following ranks. Existing DOM nodes retain identity and focus.
3. **Incremental removal.** Detach, reparent, and individual destruction remove the child from rendered order, restore its own positioning, and update only following order declarations. Remaining layout is current before destruction callbacks run. Derived references are released on destruction.

Property writes and hierarchy edits remain synchronous. Layout settings, sort-key changes, explicit reorders, and rollback rebuild output. No batching API or deferred layout behavior is introduced. Focused tests cover immediate geometry, equal-key ordering, nested/composed layouts, failed placement, reentrant/failing cleanup, and surviving text selection.

The compatibility audit records the requested baseline's behavior:

| Observation                                                    | Before      | Optimized   |
| -------------------------------------------------------------- | ----------- | ----------- |
| Two untouched Frames share Size identity                       | true        | true        |
| Two untouched Frames share Position identity                   | true        | true        |
| Size and its axes are frozen                                   | true        | true        |
| Assigning one Frame's Size leaves the other unchanged          | true        | true        |
| Raw mouseenter listener registered before typed hover callback | raw → typed | raw → typed |

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

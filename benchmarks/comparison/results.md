# Expanded FrameKit / React performance profile

Library source: f5585805fef48b251c5b30dbeedc2e624e55f250. Baseline: 999410fd39ebdad94aa16442fb44d05402cb0058.
Measured: 2026-10-13T09:18:08.309Z. Apple M5, Chromium 156.0.8078.4, React 19.3.0; production builds; CPU throttle 1×.

All values below are **milliseconds; lower is better**. They are medians of 3 round medians, each with 7 measured repetitions after two warmups. Raw samples and pooled p95 values are in the JSON report. Sub-millisecond values are coarse diagnostics, not precise speed ratios.

| Scenario                                | Before FK | Optimized FK | React root update | React local state |
| --------------------------------------- | --------: | -----------: | ----------------: | ----------------: |
| Create 1,000 rows                       |      10.7 |          7.9 |               4.2 |               4.8 |
| Create 5,000 rows                       |      51.3 |         35.8 |              31.0 |              32.6 |
| Rotate 1 of 5,000 rows                  |       0.2 |          0.2 |               2.6 |               0.6 |
| Rotate 10 of 5,000 rows                 |       0.2 |          0.2 |               3.3 |               0.7 |
| Rotate 500 of 5,000 rows                |       1.3 |          1.1 |               3.5 |               1.5 |
| Rotate 5,000 of 5,000 rows              |       9.2 |          6.4 |               6.5 |               7.5 |
| 5,000 no-op writes                      |       2.3 |          0.7 |               2.7 |               0.5 |
| Three-property patch × 1,000            |       4.2 |          3.5 |               3.0 |               3.4 |
| Three direct setters × 1,000            |       5.4 |          3.5 |               2.9 |               3.3 |
| Update 1,000 text labels                |      64.9 |         64.5 |               3.1 |               3.6 |
| Update 1,000 corner modifiers           |       2.4 |          2.4 |               2.7 |               3.1 |
| 1,000 writes + committed-DOM observers  |       2.9 |          2.5 |               2.8 |               2.7 |
| Reverse 5,000 keyed rows                |      13.2 |         11.9 |              27.1 |              27.8 |
| Append 10 to a live 1,000-row layout    |       6.5 |          5.7 |               0.7 |               1.0 |
| Append 100 to a live 1,000-row layout   |      63.2 |         53.6 |               1.0 |               1.5 |
| Remove 100 from a live 1,100-row layout |      78.6 |         68.4 |               0.7 |               1.0 |
| Subscribe 1,000 hover targets           |       0.3 |          0.4 |               0.5 |               0.7 |
| Deliver 1,000 hover events              |       1.5 |          1.9 |               5.3 |               4.4 |
| Destroy 5,000 plain rows                |      11.4 |          1.6 |               0.8 |               1.2 |
| Destroy 1,000 subscribed hover targets  |       2.4 |          0.6 |               0.3 |               0.3 |
| 20 lifetimes × 100 subscribed rows      |      28.2 |         17.4 |               8.5 |               8.6 |

## Main optimizations and compatibility

1. **Lazy hover connections.** Unused Frames no longer allocate hover listeners and AbortControllers. First subscription connects one native bridge for that event; callback disposal and node destruction still release subscriptions. After early unsubscribe, the bridge stays owned until node destruction, as before.
2. **Shared accessors and defaults.** Nodes reuse property accessor functions and deeply immutable default values. Assigning a property still updates only that node. Equal default values can now have shared object identity across nodes; code that compares defaults with strict equality can observe this.
3. **Weakly cached immutable snapshots.** Only fully frozen data graphs without enumerable accessors are cached. Mutable children, accessor-backed values, and cycles containing mutable data remain independently snapshotted. Weak caching does not keep the values alive by itself.
4. **Less work per property transaction.** A direct setter snapshots its value rather than its private one-field wrapper. Validation and commit reuse one proposed record. Base GUI validation checks the written fields, while modifier relationship checks still receive the complete proposed state. Atomic patches, rollback, notifications, and no-op animation interruption remain covered by tests.
5. **Less empty rendering/style work.** Nodes with no modifiers skip empty modifier reconciliation. Style layers avoid intermediate entry pairs and union Sets, retain precedence, and restore the next style owner when an override disappears.

The audit confirms these observable differences:

| Observation                                                    | Before      | Optimized   |
| -------------------------------------------------------------- | ----------- | ----------- |
| Two untouched Frames share Size identity                       | false       | true        |
| Two untouched Frames share Position identity                   | false       | true        |
| Size and its axes are frozen                                   | true        | true        |
| Assigning one Frame's Size leaves the other unchanged          | true        | true        |
| Raw mouseenter listener registered before typed hover callback | typed → raw | raw → typed |

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

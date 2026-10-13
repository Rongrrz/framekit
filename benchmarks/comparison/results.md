# Expanded FrameKit / React performance profile

Library source: f88f95af7eef91c54b7d3371c7846cdc548a4406. Baseline: 13bbf6d06b85775bcd4dc3d937c7f8d827b8842d.
Measured: 2026-10-13T19:39:40.027Z. Apple M5, Chromium 156.0.8078.4, React 19.3.0; production builds; CPU throttle 1×.

This run covers 23 scenarios. All values below are **milliseconds; lower is better**. They are medians of 5 round medians, each with 11 measured repetitions after two warmups. Raw samples and pooled p95 values are in the JSON report. Sub-millisecond values are coarse diagnostics, not precise speed ratios.

| Scenario                                      | Before FK | Optimized FK | React root update | React local state |
| --------------------------------------------- | --------: | -----------: | ----------------: | ----------------: |
| Create 1,000 rows                             |       7.6 |          7.8 |               4.3 |               4.8 |
| Create 5,000 rows                             |      35.7 |         33.4 |              31.7 |              33.1 |
| Rotate 1 of 5,000 rows                        |       0.2 |          0.2 |               2.9 |               0.7 |
| Rotate 10 of 5,000 rows                       |       0.3 |          0.3 |               3.2 |               0.7 |
| Rotate 500 of 5,000 rows                      |       1.3 |          1.2 |               3.5 |               1.6 |
| Rotate 5,000 of 5,000 rows                    |       6.7 |          6.5 |               6.5 |               7.5 |
| 5,000 no-op writes                            |       0.8 |          0.9 |               2.8 |               0.5 |
| Three-property patch × 1,000                  |       3.6 |          3.6 |               2.9 |               3.1 |
| Three direct setters × 1,000                  |       3.5 |          3.5 |               2.6 |               3.1 |
| Update 1,000 text labels                      |       5.3 |          5.2 |               3.4 |               3.7 |
| Update 1,000 corner modifiers                 |       2.3 |          2.5 |               2.6 |               3.1 |
| 1,000 writes + committed-DOM observers        |       2.5 |          2.5 |               3.0 |               2.8 |
| Reverse 5,000 keyed rows                      |      11.1 |          7.3 |              27.1 |              29.2 |
| Append 10 to a live 1,000-row layout          |       0.4 |          0.3 |               0.8 |               1.1 |
| Append 100 to a live 1,000-row layout         |       1.0 |          0.9 |               1.1 |               1.4 |
| Prepend 100 to a live 1,000-row layout        |      17.9 |          1.0 |               1.2 |               1.4 |
| Remove 100 from a live 1,100-row layout       |       1.2 |          0.4 |               0.8 |               1.0 |
| Remove first 100 from a live 1,100-row layout |      18.1 |          0.4 |               0.8 |               1.1 |
| Subscribe 1,000 hover targets                 |       0.4 |          0.5 |               0.5 |               0.7 |
| Deliver 1,000 hover events                    |       1.6 |          2.0 |               4.9 |               4.7 |
| Destroy 5,000 plain rows                      |       1.7 |          1.3 |               0.9 |               1.2 |
| Destroy 1,000 subscribed hover targets        |       0.7 |          0.6 |               0.3 |               0.3 |
| 20 lifetimes × 100 subscribed rows            |      17.8 |         16.7 |               8.6 |               8.8 |

## Main optimizations and compatibility

The default baseline already includes the earlier text-sizing and incremental-layout optimizations. This change removes the remaining duplicate CSS-rank work:

1. **Sorted DOM owns placement.** List/grid layouts already sorted DOM nodes for reading and tab order. Arranged children now share neutral CSS order 0, letting that same DOM order determine visual placement.
2. **Edits leave survivors untouched.** Insertion applies placement rules only to the new child and moves it to the sorted DOM position. Removal restores only the departing child's own styles. The renderer no longer renumbers following siblings or allocates rank strings.
3. **Layer restoration remains intact.** Neutral CSS order overrides lower style owners while a layout is active; detaching the layout restores their values. LayoutOrder and Name still determine sorting, with explicit hierarchy order breaking ties.

Property writes and hierarchy edits remain synchronous. Layout settings, sort-key changes, explicit reorders, and rollback rebuild output. No batching API or deferred layout behavior is introduced. Focused tests cover immediate geometry, equal-key ordering, nested/composed layouts, failed placement, reentrant/failing cleanup, and surviving text selection in Chromium, Firefox, and WebKit. Focused cases also verify that front edits do not mutate surviving row attributes.

The compatibility audit records the requested baseline's behavior:

| Observation                                                    | Before      | Optimized   |
| -------------------------------------------------------------- | ----------- | ----------- |
| Two untouched Frames share Size identity                       | true        | true        |
| Two untouched Frames share Position identity                   | true        | true        |
| Size and its axes are frozen                                   | true        | true        |
| Assigning one Frame's Size leaves the other unchanged          | true        | true        |
| Raw mouseenter listener registered before typed hover callback | raw → typed | raw → typed |
| Inline CSS orders for a later/earlier pair                     | 1, 0        | 0, 0        |
| Earlier child is first in sorted DOM order                     | true        | true        |

Inline CSS order is an observable implementation change: consumers inspecting unsafeElement now see 0 instead of a sequential rank. Public LayoutOrder values, visual/DOM/tab sorting, and synchronous geometry are preserved. Native scroll anchoring remains enabled; focused content can stay stationary as the browser adjusts its scroll position.

Default sharing and hover registration are unaffected by this optimization. Earlier allocation optimizations shared frozen defaults and made hover listeners lazy; choosing an older baseline can expose identity and raw/typed listener-order differences in the audit above.

## What the wider matrix reveals

- Sparse updates and keyed reversal are useful FrameKit cases. Construction, text-host rendering, and repeated subscribed lifetimes still have measurable overhead.
- **Text:** ordinary updates no longer force geometry reads. Scaled/wrapped fitting remains a separate, more expensive path that this ordinary-label case does not measure.
- **Live-layout edits:** the matrix measures both ends. Tail removal destroys the final 100 rows in forward order; front removal destroys the first 100 in forward order. Prepending assigns new FrameKit rows LayoutOrder -1 ahead of the existing rows at 0; React prepends keyed DOM rows in one commit. FrameKit and React now both rely on sorted DOM order for placement. FrameKit still commits individual edits immediately and splices its hierarchy and rendered-order arrays, while React batches the operation. These cases do not imply constant-time arbitrary insertion/removal.
- **Transaction semantics:** React batches each requested operation into one commit; FrameKit commits each individual edit immediately. No-op writes also differ: FrameKit validates and publishes its internal write event, allowing assignment to interrupt an animation. React same-state local updates can bail out without rendering.

## Scope and reproduction

Run npm ci --prefix benchmarks/comparison, then node benchmarks/comparison/run.mjs. Use --cases <comma-separated-case-ids> for focused runs, --baseline <local-git-ref>, --rounds <n>, --repetitions <n>, --cpu-throttle <integer>, and --out <path.json> to vary the run. The baseline must exist locally. The runner builds the same benchmark against an exported Git source tree and the current source, alternates version/runtime order, checks observable results, and removes temporary builds after completion.

React root cases use keyed plain rows with one flushSync per complete operation. Local cases use per-row state. The observer and resource cases require per-row effects in both React variants. Text compares FrameKit TextLabel against an equivalent div/span rendering, not a recreation of all FrameKit text features. Hover delivery is programmatic native/synthetic event dispatch, not real pointer-to-paint latency. The manual three-setter case performs three synchronous FrameKit transactions; the React operation stays batched.

Geometry-changing cases force layout; hover cases measure subscription or dispatch work. Painting, hydration, network load, retained-memory leaks, mobile hardware, long-running animation, and full application responsiveness are outside this matrix. React Compiler is disabled. There are no hardware-dependent timing assertions in CI.

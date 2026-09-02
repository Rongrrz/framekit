# FrameKit performance optimization results

This report preserves `COMPARISON.md` and replaces its theoretical projections with measurements. It is not a claim that FrameKit or React is universally faster.

Measured on September 1, 2026 in Chrome 151 on macOS. Both implementations were bundled and minified in production mode. Every result includes warmup rounds and reports the median. React updates used `flushSync` so the requested DOM output was complete before timing stopped, matching FrameKit's immediate-consistency contract.

## Method

- Core workloads: 3 warmup rounds; 9 measured rounds at 1 and 1,000 objects, 5 at 10,000, and 3 at 100,000.
- Layout and TextScaled: 2 warmups; 7 measured rounds at 1,000 and 5 at 10,000 where practical.
- Springs: 2 warmups and 5 measured rounds, with JavaScript callback time accumulated across 12 animation frames.
- `performance.now()` measured synchronous JavaScript and DOM mutation separately from a forced-layout read (`offsetHeight`). Paint was not included.
- Results below 0.1 ms are shown as below timer resolution rather than treated as a meaningful lead.
- Controlled heap snapshots were not available in this browser harness, so this report makes no numeric memory claim. Allocation reductions were verified structurally and with runtime timing, not converted into unreliable heap estimates.

The workloads intentionally preserve required behavior: property assignment is direct and immediate, every assignment interrupts an animation owner even when the value is unchanged, animations own individual properties, and destruction performs complete recursive cleanup.

## Core production benchmark

### Before and after FrameKit

| Objects | Operation                    |  Before |   After |                  Change |
| ------: | ---------------------------- | ------: | ------: | ----------------------: |
|       1 | Create                       |  0.1 ms |  0.1 ms | Below useful resolution |
|       1 | One-property update          | <0.1 ms | <0.1 ms | Below useful resolution |
|   1,000 | Create                       |  3.7 ms |  4.6 ms |              24% slower |
|   1,000 | 1,000 repeated local updates |  1.6 ms |  0.5 ms |             3.2x faster |
|   1,000 | Bulk one-property update     |  1.9 ms |  0.7 ms |             2.7x faster |
|   1,000 | Forced layout                |  1.2 ms |  1.3 ms |   Effectively unchanged |
|   1,000 | Destroy                      |  2.5 ms |  2.5 ms | Unchanged at this scale |
|  10,000 | Create                       | 43.5 ms | 47.6 ms |               9% slower |
|  10,000 | 1,000 repeated local updates |  1.7 ms |  0.4 ms |             4.3x faster |
|  10,000 | Bulk one-property update     | 22.3 ms | 10.1 ms |             2.2x faster |
|  10,000 | Forced layout                | 16.3 ms | 14.8 ms |               9% faster |
|  10,000 | Destroy                      | 50.8 ms | 25.3 ms |             2.0x faster |

Creation regressed modestly because each GUI node now establishes cached property and CSS-render state. That cost was retained because it produces large, repeatable update improvements without changing assignment semantics. The 1,000-object destruction result is too small and noisy to show the algorithmic improvement; the 10,000- and 100,000-object runs expose it more clearly.

### Final FrameKit and React, equivalent workload

| Objects | Operation                    | FrameKit |      React | Faster in this workload      |
| ------: | ---------------------------- | -------: | ---------: | ---------------------------- |
|   1,000 | Create                       |   4.6 ms |     2.1 ms | React                        |
|   1,000 | One-property update          |  <0.1 ms |     0.1 ms | Too small for a strong ratio |
|   1,000 | 1,000 repeated local updates |   0.5 ms |    32.5 ms | FrameKit                     |
|   1,000 | Bulk one-property update     |   0.7 ms |     0.6 ms | Effectively tied             |
|   1,000 | Forced layout                |   1.3 ms |     1.4 ms | Effectively tied             |
|   1,000 | Destroy                      |   2.5 ms |     0.3 ms | React                        |
|  10,000 | Create                       |  47.6 ms |    19.1 ms | React                        |
|  10,000 | One-property update          |  <0.1 ms |     0.5 ms | FrameKit                     |
|  10,000 | 1,000 repeated local updates |   0.4 ms |   341.4 ms | FrameKit                     |
|  10,000 | Bulk one-property update     |  10.1 ms |     6.9 ms | React                        |
|  10,000 | Forced layout                |  14.8 ms |    15.7 ms | Effectively tied             |
|  10,000 | Destroy                      |  25.3 ms |     3.7 ms | React                        |
| 100,000 | Create                       | 552.6 ms |   222.7 ms | React                        |
| 100,000 | One-property update          |  <0.1 ms |     4.8 ms | FrameKit                     |
| 100,000 | 1,000 repeated local updates |   0.4 ms | 4,032.6 ms | FrameKit                     |
| 100,000 | Bulk one-property update     | 143.7 ms |    83.1 ms | React                        |
| 100,000 | Forced layout                | 193.0 ms |   172.3 ms | React                        |
| 100,000 | Destroy                      | 260.5 ms |    38.5 ms | React                        |

React's declarative state path is advantageous for creation, batched broad updates, and unmounting. FrameKit's persistent-object model has a much shorter path when repeatedly mutating one known object. These are different strengths; neither table should be generalized to application logic, input responsiveness, paint, network cost, or server rendering.

## Layout, TextScaled, and animation

| Scenario      | Scale and metric                                  |     Before |      After | React after |
| ------------- | ------------------------------------------------- | ---------: | ---------: | ----------: |
| UIListLayout  | Create 1,000                                      |     7.6 ms |     5.9 ms |      1.1 ms |
| UIListLayout  | Update one child's `LayoutOrder`, 1,000 children  |     4.2 ms |     0.6 ms |      0.1 ms |
| UIListLayout  | Create 10,000                                     |    62.0 ms |    59.4 ms |      7.0 ms |
| UIListLayout  | Update one child's `LayoutOrder`, 10,000 children |    46.5 ms |     6.3 ms |      0.6 ms |
| TextScaled    | Create 1,000 labels                               |    10.8 ms |    10.7 ms |  1,313.5 ms |
| TextScaled    | Update all 1,000 labels                           | 1,610.0 ms | 1,412.3 ms |  1,113.3 ms |
| 1,000 springs | Setup                                             |     5.4 ms |     6.4 ms |      1.1 ms |
| 1,000 springs | JS callback time across 12 frames                 |    24.4 ms |    12.2 ms |      8.3 ms |
| 1,000 springs | Browser callbacks across 12 frames                |     12,012 |         24 |          24 |

The callback count includes the benchmark's frame driver, hence 24 rather than 12 after scheduling was shared. The TextScaled workload is deliberately synchronous because FrameKit guarantees that DOM output is consistent immediately after assignment; it remains the largest measured bottleneck.

## Optimizations implemented

1. Property renderers receive a centralized changed-property set. Frames, screen roots, images, text, buttons, text boxes, and scrolling frames now update only CSS, attributes, scroll state, and derived output affected by the changed property.
2. Resolved inline CSS is cached per element. Equal browser values are not written again, including values that normalize multiple FrameKit properties into one CSS output.
3. Direct assignment, bindings, decorators, layouts, springs, and tweens continue through the same validated property commit and render pipeline.
4. Subtree destruction walks each child array once, clears arrays in place, avoids repeated sibling searches and splices, and removes one contained DOM subtree while still removing descendants moved outside it.
5. Append uses the known insertion index and a constant-time push fast path. DOM sibling search is skipped for the common append case.
6. Property commits reuse the original key array when every requested value changed, cache singleton changed-property sets, avoid the normal-path callback-error array, and retain complete render rollback, including aggregate reporting if rollback itself fails.
7. Animation ownership reuses per-node write tracking in the normal path. Springs reuse solution and patch objects; tweens reuse their patch object.
8. Springs and tweens share one animation-frame scheduler. Tasks added during a frame are safely deferred, cancellation remains per animation, and one failing task does not prevent other owners from advancing.
9. Layout output is reapplied incrementally instead of first clearing every child style and rerendering every child. List ordering uses compact numeric arrays instead of mapped objects and a lookup map.
10. TextScaled nodes share one `ResizeObserver`. Unwrapped text uses a canvas estimate to narrow the exact DOM verification, while the final fitted size is still checked against browser layout.
11. Internal resize and browser synchronization paths read authoritative properties without cloning public snapshots.

Rejected experiments are not present in the final code. A ratio-based TextScaled search doubled the workload time, and CSS containment did not produce a meaningful improvement.

## Bundle size

| Full production ESM build |              Raw |             Gzip |
| ------------------------- | ---------------: | ---------------: |
| Before                    |         63.58 KB |         18.28 KB |
| After                     |         68.73 KB |         19.68 KB |
| Change                    | +5.15 KB (+8.1%) | +1.40 KB (+7.7%) |

FrameKit still has no runtime package dependencies. React was installed only in the temporary benchmark workspace and was removed from the repository after measurement.

## Semantics and risk review

- Normal property assignment, immediate property/DOM consistency, atomic mutation rollback, events, bindings, responsive values, decorators, and layouts remain unchanged in the public API.
- A direct assignment still emits the property-write signal before equality filtering, so it interrupts a spring or tween even when assigning the current value.
- Animation claims remain single-property and interruption-safe. Destroy still cancels animations and removes observers, listeners, bindings, and descendants through registered cleanup.
- The CSS cache assumes FrameKit owns the inline properties it renders. Code using the low-level `.element` escape hatch to mutate the same inline property behind FrameKit's back can temporarily diverge until FrameKit resolves a different value. Direct DOM manipulation remains an integration escape hatch, not the normal application model.
- Canvas measurement is only an estimate. Browser DOM dimensions remain the final authority, preserving exact output at the cost of synchronous layout work.
- No public batching API was added, and broad updates remain synchronous. This preserves the current user experience but leaves FrameKit behind React on large batched workloads.

All retained stages passed formatting, TypeScript checking, linting, 119 library tests, 14 playground tests, and production library/playground builds.

## Remaining bottlenecks

1. TextScaled alternates exact browser reads and writes during fitting. Updating 1,000 labels still takes about 1.4 seconds.
2. Creation allocates a persistent handle, runtime state, validation state, property metadata, and CSS cache for every object. React is 2.5x faster at 10,000 objects in this workload.
3. Destruction is linear but still performs every FrameKit cleanup and state transition in JavaScript. React unmount is substantially faster in this synthetic tree.
4. A changed list key still resolves and sorts the complete sibling list; the new path avoids destructive clearing but does not make ordering incremental.
5. Modifier composition still recomputes the relevant modifier stack when a base property can affect derived styles.
6. Paint and controlled heap-allocation results remain unmeasured. They require browser tracing and forced-GC heap snapshots rather than `performance.now()` or noisy live-heap counters.

## Recommended next optimization

Add a two-phase TextScaled coordinator for `ResizeObserver`-driven work: collect all stable bounds first, compute canvas candidates together, then perform exact verification writes. Keep direct text/property assignments on the current synchronous path so immediate consistency is preserved. This targets the dominant measured cost without introducing a user batching API or weakening semantics.

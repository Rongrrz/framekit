# FrameKit / React performance comparison

Current source HEAD: `22a2e9010be2ae3102ba4bd21f9dbc6a24d1ce31`. Baseline: `2620a6a6d0fc21b27d0fb2764b6306b074f7542b`.
The library source tree was clean.

Captured source SHA-256: before 3ebfff916e5b4dea20d6035a12117d4293467fbca22fddb152eabd0a8f28479c; current 63b5e19d894772f4f462de753a504df14afa249d8a478873b6ed740de30bf2ff.

Measured 2026-10-14T13:12:42.137Z. Apple M5, production Chromium 156.0.8078.4, React 19.3.0; CPU throttle 1×.

## Timings

This run covers 23 scenarios. Milliseconds, lower is better. Medians are the median of 5 round medians, each with 21 measured repetitions after 2 warmups. p95 pools the measured samples. Negative changes mean less elapsed time, not increased throughput. Small timings and tails are noisy diagnostics, not confidence intervals or full-application rankings.

| Scenario                                      | Before FK | Current FK | Median change | p95 before → current | React root | React local |
| --------------------------------------------- | --------: | ---------: | ------------: | -------------------: | ---------: | ----------: |
| Create 1,000 rows                             |       6.4 |        6.7 |         +4.7% |            8.7 → 8.5 |        4.7 |         4.8 |
| Create 5,000 rows                             |      42.5 |       42.2 |         -0.7% |          51.7 → 72.8 |       31.8 |        44.2 |
| Rotate 1 of 5,000 rows                        |       0.6 |        0.4 |        -33.3% |            1.0 → 0.9 |        3.3 |         1.2 |
| Rotate 10 of 5,000 rows                       |       0.9 |        0.8 |        -11.1% |            1.1 → 1.4 |        3.6 |         1.7 |
| Rotate 500 of 5,000 rows                      |       1.4 |        1.4 |         +0.0% |            2.9 → 2.3 |        3.5 |         1.8 |
| Rotate 5,000 of 5,000 rows                    |       6.4 |        6.4 |         +0.0% |            7.8 → 7.3 |        6.7 |         7.6 |
| 5,000 no-op writes                            |       1.4 |        1.4 |         +0.0% |            4.6 → 3.0 |        3.9 |         0.9 |
| Three-property patch × 1,000                  |       3.8 |        3.5 |         -7.9% |            4.4 → 4.1 |        2.9 |         3.1 |
| Three direct setters × 1,000                  |       3.7 |        3.5 |         -5.4% |            4.3 → 4.0 |        2.9 |         3.2 |
| Update 1,000 text labels                      |       4.4 |        4.3 |         -2.3% |            4.8 → 4.7 |        3.6 |         3.9 |
| Update 1,000 corner modifiers                 |       2.7 |        2.6 |         -3.7% |            3.1 → 3.1 |        2.8 |         2.9 |
| 1,000 writes + committed-DOM observers        |       2.7 |        2.7 |         +0.0% |            2.9 → 3.0 |        2.8 |         2.7 |
| Reverse 5,000 keyed rows                      |       7.1 |        7.0 |         -1.4% |            7.5 → 7.5 |       29.0 |        60.4 |
| Append 10 to a live 1,000-row layout          |       0.3 |        0.3 |         +0.0% |            0.9 → 0.9 |        0.8 |         1.0 |
| Append 100 to a live 1,000-row layout         |       0.8 |        0.8 |         +0.0% |            1.4 → 1.4 |        1.1 |         1.4 |
| Prepend 100 to a live 1,000-row layout        |       0.9 |        0.9 |         +0.0% |            1.5 → 1.5 |        1.2 |         1.4 |
| Remove 100 from a live 1,100-row layout       |       0.4 |        0.4 |         +0.0% |            0.5 → 0.5 |        0.8 |         1.0 |
| Remove first 100 from a live 1,100-row layout |       0.4 |        0.4 |         +0.0% |            0.6 → 0.8 |        0.9 |         1.1 |
| Subscribe 1,000 hover targets                 |       0.4 |        0.4 |         +0.0% |            0.6 → 0.5 |        0.5 |         0.7 |
| Deliver 1,000 hover events                    |       2.5 |        2.2 |        -12.0% |            5.7 → 5.5 |        4.7 |         4.7 |
| Destroy 5,000 plain rows                      |       1.5 |        1.4 |         -6.7% |            2.1 → 3.7 |        0.9 |         1.3 |
| Destroy 1,000 subscribed hover targets        |       0.6 |        0.6 |         +0.0% |            0.9 → 0.9 |        0.3 |         0.3 |
| 20 lifetimes × 100 subscribed rows            |      19.0 |       14.1 |        -25.8% |          34.4 → 50.3 |        9.4 |         9.4 |

## Observed compatibility

These observations come from the fixture audit. They compare the requested versions and do not establish complete API compatibility.

| Observation                                            | Before      | Current     |
| ------------------------------------------------------ | ----------- | ----------- |
| Untouched Frames share Size identity                   | true        | true        |
| Untouched Frames share Position identity               | true        | true        |
| Size and its axes are frozen                           | true        | true        |
| Assigning one Size leaves the other unchanged          | true        | true        |
| Hover listener order when raw subscription comes first | raw → typed | raw → typed |
| Inline CSS order for a later/earlier pair              | 0, 0        | 0, 0        |
| Earlier child is first in sorted DOM order             | true        | true        |

## Measurement contracts

- Runtime isolation: fresh page per version/runtime/round. Version order alternates and runtime scheduling rotates. Process scheduling and system load still affect timing.
- React root renders keyed rows from root state; React local uses per-row state. React receives one flushSync per complete operation. Observer/resource cases use per-row effects in both variants. FrameKit commits each property or hierarchy edit synchronously.
- FrameKit no-op writes still validate and publish write events, allowing same-value assignments to interrupt animations. React local same-state updates can bail out without rendering.
- Ordinary text compares FrameKit TextLabel with an equivalent div/span. Scaled/wrapped fitting and all text features are not reproduced.
- Prepending places keyed rows before existing rows; FrameKit assigns the new rows LayoutOrder -1. Front and tail removal destroy the respective 100 rows in forward order. Immediate FrameKit edits still splice hierarchy/render-order arrays; these timings do not imply constant-time edits.
- Hover compares programmatic native/synthetic event dispatch, not real pointer-to-paint latency.
- Geometry-changing cases force layout; hover cases measure subscriptions or dispatch. Includes paint: false. React Compiler: false.

Hydration, network, retained-memory leaks, mobile hardware, and full application responsiveness are outside this matrix. No hardware-dependent timing thresholds run in CI. Raw samples, environment, revisions, audits, and the harness fingerprint are in [runtime-audit-results.json](runtime-audit-results.json).

## Reproduction

From the repository root, with the benchmark dependencies and Playwright Chromium installed:

```sh
node benchmarks/comparison/run.mjs --baseline 2620a6a6d0fc21b27d0fb2764b6306b074f7542b --rounds 5 --repetitions 21 --cpu-throttle 1 --cases create-1000,create-5000,rotate-1,rotate-10,rotate-500,rotate-5000,noop,patch,separate,text,corner,observed,reverse,append-10,append-100,prepend-100,remove-100,remove-front-100,hover-bind,hover-dispatch,destroy,destroy-resources,cycles --out /tmp/comparison.json
```

To repeat the same current source, check out its recorded revision and restore any recorded uncommitted changes. Use --cases for a comma-separated subset and --cpu-throttle for a positive integer throttle. The baseline must exist locally. The runner builds both sources in production mode, checks observable fixture results, and removes temporary builds when finished. This report does not attribute each timing difference to a particular code change.

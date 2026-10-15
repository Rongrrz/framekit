# FrameKit / React performance comparison

Current source HEAD: `2dac13b92f7cb6a3c640327eb6bbbdf275d7d980`. Baseline: `2dac13b92f7cb6a3c640327eb6bbbdf275d7d980`.
Uncommitted library changes were included:

```text
M src/helpers/virtual-list.ts
```

Captured source SHA-256: before 78042ba9011108c3cd360f7823f05e259ee92e41df2effdf4051aa4384485d1c; current c4f7440e2c9958173d2c1d8dcae9ed381deeda0b30fa97097acb053d9e7b047d.

Measured 2026-10-15T23:18:48.660Z. Apple M5, production Chromium 156.0.8078.4, React 19.3.0; CPU throttle 1×.

## Timings

This run covers 5 scenarios. Milliseconds, lower is better. Medians are the median of 3 round medians, each with 31 measured repetitions after 2 warmups. p95 pools the measured samples. Negative changes mean less elapsed time, not increased throughput. Small timings and tails are noisy diagnostics, not confidence intervals or full-application rankings.

| Scenario                               | Before FK | Current FK | Median change | p95 before → current | React root | React local |
| -------------------------------------- | --------: | ---------: | ------------: | -------------------: | ---------: | ----------: |
| Three-property patch × 1,000           |       3.4 |        3.4 |         +0.0% |            3.6 → 3.8 |        2.8 |         2.8 |
| Three direct setters × 1,000           |       3.5 |        3.5 |         +0.0% |            4.1 → 4.0 |        2.7 |         2.9 |
| Destroy 5,000 plain rows               |       1.5 |        1.5 |         +0.0% |            2.0 → 2.1 |        1.0 |         1.3 |
| Destroy 1,000 subscribed hover targets |       0.5 |        0.5 |         +0.0% |            0.7 → 0.9 |        0.3 |         0.3 |
| 20 lifetimes × 100 subscribed rows     |      11.0 |       11.1 |         +0.9% |          13.6 → 18.1 |        8.3 |         8.4 |

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

Hydration, network, retained-memory leaks, mobile hardware, and full application responsiveness are outside this matrix. No hardware-dependent timing thresholds run in CI. Raw samples, environment, revisions, audits, and the harness fingerprint are in [application-validation-results.json](application-validation-results.json).

## Reproduction

From the repository root, with the benchmark dependencies and Playwright Chromium installed:

```sh
node benchmarks/comparison/run.mjs --baseline 2dac13b92f7cb6a3c640327eb6bbbdf275d7d980 --rounds 3 --repetitions 31 --cpu-throttle 1 --cases patch,separate,destroy,destroy-resources,cycles --out /tmp/comparison.json
```

To repeat the same current source, check out its recorded revision and restore any recorded uncommitted changes. Use --cases for a comma-separated subset and --cpu-throttle for a positive integer throttle. The baseline must exist locally. The runner builds both sources in production mode, checks observable fixture results, and removes temporary builds when finished. This report does not attribute each timing difference to a particular code change.

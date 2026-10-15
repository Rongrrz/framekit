# Measured-list application validation and runtime profiles

The `/inbox.html` playground screen exercises 2,000 persistent messages with filtering,
empty results, listbox selection, expansion, nested automatic layout, late HTTP image
attachments, delayed local font loading, mobile resizing, and destruction with pending work.
Browser tests control image delivery separately from the asset's JavaScript module. Font loading
uses the platform's Arial/Liberation Sans/DejaVu Sans/Helvetica face, rather than a remote service.
Screenshots and geometry checks wait for measurements and verify that adjacent rows do not overlap.

## Regressions fixed

- Revisited keys can have stale cached heights when images or font metrics changed offscreen.
  A requested row now remains visible through late measurements until a new scroll, selection,
  source replacement, or viewport-width change supersedes that request. No browser scroll is
  blocked; callers can override the position immediately.
- Rounding each fractional scroll adjustment independently accumulated anchor drift. The binding
  now preserves the unrounded requested position while accepting native range clamping. A
  repeated 20-step, 0.4-pixel resize case protects against accumulating error.

Affected inbox and measured-list cases passed Chromium, Firefox, and WebKit. They cover cached
row remounts, image/font reflow, stable anchors, bounded DOM, keyboard visibility, empty-to-full
filtering, fractional changes, and owned cleanup. Subpixel comparisons permit less than one
CSS pixel of native rounding. Fixed-height selection/scroll cases also passed Chromium.

## Patch and teardown evidence

The [focused production comparison](../benchmarks/comparison/application-validation-results.md)
retains [raw samples](../benchmarks/comparison/application-validation-results.json): three rounds,
31 repetitions, five scenarios, alternating version order and rotating runtime order. The baseline
is `2dac13b`; current source includes the measured-list fixes, with exact hashes in each report.

| Workload                           | Before median | Current median | Before p95 | Current p95 |
| ---------------------------------- | ------------: | -------------: | ---------: | ----------: |
| Three-property patch × 1,000       |        3.4 ms |         3.4 ms |     3.6 ms |      3.8 ms |
| Three direct setters × 1,000       |        3.5 ms |         3.5 ms |     4.1 ms |      4.0 ms |
| Destroy 5,000 plain rows           |        1.5 ms |         1.5 ms |     2.0 ms |      2.1 ms |
| Destroy 1,000 subscribed rows      |        0.5 ms |         0.5 ms |     0.7 ms |      0.9 ms |
| 20 lifetimes × 100 subscribed rows |       11.0 ms |        11.1 ms |    13.6 ms |     18.1 ms |

The lifetime tail increase was investigated with a [three-round × 51-repetition control](../benchmarks/comparison/application-cycle-control.md)
and its [raw samples](../benchmarks/comparison/application-cycle-control.json). Before/current
built JavaScript SHA-256 hashes are identical (`ff0d5494245f9967e4a42cdc51366e0beb05d2f9cb20c74de83390d5fa012a55`).
The control measured 11.0 → 10.9 ms medians and 16.6 → 16.3 ms p95. This establishes variability
with identical executable code; it does not make every possible tail increase harmless. There
is no claimed speedup or universal regression-free result.

The separate [CPU profile summary](../benchmarks/diagnostics/runtime-profile-results.json) records
unminified production code with 100-microsecond sampling. Setup, explicit GC, verification, and
fixture cleanup sit outside the recording. Patch recordings perform 31 transactions on 1,000 rows;
teardown recordings use 50,000 rows for enough samples. Instrumented times do not belong in the
minified comparison above. Full local `.cpuprofile` paths and the source hash are in the summary.

Across three patch recordings, frequently sampled frames included geometry reads (826 samples),
snapshot copying (353), CSS property writes (258), and immutable-snapshot checks (138). Plain
teardown primarily sampled recursive destruction (142) and DOM removal (132); subscribed teardown
also sampled event-map clearing (173) and native listener removal (97). These are sample counts,
not weighted CPU percentages or complete causal attribution. Required validation, snapshots,
committed-DOM observers, animation interruption, and owned cleanup remain intact. No speculative
cache or weakened contract was added to improve these numbers.

Reproduction:

```sh
npm run benchmark:runtime -- --repetitions 3 --out /tmp/framekit-runtime-profile.json
node benchmarks/comparison/run.mjs --baseline 2dac13b --rounds 3 --repetitions 31 \
  --cases patch,separate,destroy,destroy-resources,cycles --out /tmp/comparison.json
node benchmarks/comparison/run.mjs --baseline 2dac13b --rounds 3 --repetitions 51 \
  --cases cycles --out /tmp/cycle-control.json
```

These figures describe Apple M5 / Chromium 156 at 1× CPU throttle and exclude painting in the
comparison. CPU recordings include instrumentation overhead. The real inbox tests verify browser
behavior and late content, not hardware-independent speed budgets. No timing threshold was added
to CI.

## Verification after modularization

The inspector now separates workspace construction, hierarchy rendering, property details,
and picking from its controller. Virtual lists separate keyed geometry, native measurement
scheduling, mounted rows, and keyboard interaction from scroll coordination. Floating panels
keep transition cancellation and hooks in one motion module. Playground documentation separates
chapters and article rendering from navigation; comparison workloads and runtime fixtures have
independent modules. Public entry points remain compatible. Cohesive test suites remain grouped
by the behavior they protect.

Focused unit checks passed for inspector state, virtual lists and geometry, tooltip/popover
behavior, playground rendering, and dependency boundaries. Inspector, inbox, and measured-list
browser cases passed Chromium, Firefox, and WebKit; fixed lists, overlays, and documentation
cases passed Chromium. Type checking, library/playground production builds, and all eight
packaged-consumer checks passed. A rebuilt production inbox also passed attachment/font loading,
last-row visibility, destruction, and console checks.

All 23 comparison scenarios passed a one-round, three-repetition harness smoke check against
`606e989`. Each of the lifecycle, responsiveness, and runtime diagnostic commands also completed.
The [final production lifecycle report](../benchmarks/diagnostics/modularity-lifecycle-results.json) sampled 1,150 objects across five lifetimes: none remained
after collection, with 21 DOM nodes and 13 native listeners both before and after. Heap usage
increased by 673,300 bytes; diagnostic bookkeeping and runtime caches are included, so the
sampled collectibility and listener results do not imply zero total memory growth.

The timing/profile evidence above predates the modularization. The short final harness run
validates workload contracts and command execution; it is not a statistical performance
comparison. The comparison harness now fingerprints its extracted modules and removes unused
cross-runtime setup bookkeeping, so older harness timings cannot establish a refactor speedup.
Measured row heights remain opt-in and use estimates until rows have been observed.

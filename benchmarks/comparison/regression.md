# Regression audit after the DOM-order optimization

No median regression was found in the matched full run: all 23 FrameKit medians were equal
to or below the pre-optimization baseline. Tail timings were not uniformly lower. Hover delivery
remains flagged after the focused follow-up: its median improved, but p95 increased from 3.5 to
4.8 ms. Identical-source controls showed meaningful measurement variation, so this does not
establish a library cause, but it also does not justify declaring every tail regression-free.
These results cover production Chromium workloads on one machine, not every app.

Baseline: `13bbf6d06b85775bcd4dc3d937c7f8d827b8842d`. Current source: `cc5bfd1e8a36c4778a1ba41fe07e33bb0d77e0c5`;
its library source is unchanged from the optimization in `f88f95a`.
Measured: 2026-10-13T22:25:13.442Z. Apple M5, Chromium
156.0.8078.4, production builds, CPU throttle 1×.
The [React comparison](results.md) and [chart](comparison.png) use this same matched full run.

## Full matrix

All timings are milliseconds. Changes are **elapsed-time changes**, `(current / before - 1) × 100`;
negative means less time. Each median is the median of five round medians with 11 measured
repetitions per round, after two warmups. p95 pools the 55 measured samples for that scenario and
version. p95 is descriptive, not a confidence interval. Sub-millisecond percentages are coarse.

| Scenario                                      | Before median | Current median | Median change | Before p95 | Current p95 | p95 change |
| --------------------------------------------- | ------------: | -------------: | ------------: | ---------: | ----------: | ---------: |
| Create 1,000 rows                             |           7.7 |            7.6 |         -1.3% |       31.5 |        11.5 |     -63.5% |
| Create 5,000 rows                             |          35.5 |           34.3 |         -3.4% |      110.7 |        75.8 |     -31.5% |
| Rotate 1 of 5,000 rows                        |           0.2 |            0.2 |         +0.0% |        0.9 |         0.6 |     -33.3% |
| Rotate 10 of 5,000 rows                       |           0.3 |            0.2 |        -33.3% |        1.3 |         0.9 |     -30.8% |
| Rotate 500 of 5,000 rows                      |           1.3 |            1.1 |        -15.4% |        1.7 |         1.7 |      +0.0% |
| Rotate 5,000 of 5,000 rows                    |           6.9 |            6.8 |         -1.4% |        7.8 |         8.1 |      +3.8% |
| 5,000 no-op writes                            |           0.8 |            0.8 |         +0.0% |        2.5 |         1.6 |     -36.0% |
| Three-property patch × 1,000                  |           3.6 |            3.5 |         -2.8% |        4.9 |         3.9 |     -20.4% |
| Three direct setters × 1,000                  |           3.4 |            3.4 |         +0.0% |        3.9 |         3.7 |      -5.1% |
| Update 1,000 text labels                      |           5.3 |            5.2 |         -1.9% |        6.1 |         6.0 |      -1.6% |
| Update 1,000 corner modifiers                 |           2.3 |            2.3 |         +0.0% |        2.7 |         2.8 |      +3.7% |
| 1,000 writes + committed-DOM observers        |           2.7 |            2.6 |         -3.7% |        3.2 |         3.2 |      +0.0% |
| Reverse 5,000 keyed rows                      |          11.0 |            7.2 |        -34.5% |       23.7 |         7.8 |     -67.1% |
| Append 10 to a live 1,000-row layout          |           0.4 |            0.3 |        -25.0% |        1.2 |         1.4 |     +16.7% |
| Append 100 to a live 1,000-row layout         |           1.0 |            1.0 |         +0.0% |        1.7 |         1.5 |     -11.8% |
| Prepend 100 to a live 1,000-row layout        |          17.9 |            1.0 |        -94.4% |       20.9 |         1.6 |     -92.3% |
| Remove 100 from a live 1,100-row layout       |           1.1 |            0.4 |        -63.6% |        1.3 |         0.6 |     -53.8% |
| Remove first 100 from a live 1,100-row layout |          17.9 |            0.4 |        -97.8% |       19.1 |         0.6 |     -96.9% |
| Subscribe 1,000 hover targets                 |           0.5 |            0.5 |         +0.0% |        0.5 |         0.9 |     +80.0% |
| Deliver 1,000 hover events                    |           1.6 |            1.5 |         -6.2% |        2.9 |         3.0 |      +3.4% |
| Destroy 5,000 plain rows                      |           1.5 |            1.4 |         -6.7% |        1.9 |         1.8 |      -5.3% |
| Destroy 1,000 subscribed hover targets        |           0.7 |            0.6 |        -14.3% |        0.9 |         0.8 |     -11.1% |
| 20 lifetimes × 100 subscribed rows            |          17.2 |           16.8 |         -2.3% |       26.7 |        24.6 |      -7.9% |

Prepend, front removal, tail removal, and reversal improvements also appeared in the original
mixed-runtime rerun. Most other differences are small in absolute time and should not be
attributed to the layout change: the identical-source control moved unchanged workloads too.

## Why the runner changed

The old runner measured baseline FrameKit alone, but interleaved current FrameKit with React in
the same page. Alternating version order and rotating runtime order did not give the two FrameKit
versions the same execution history. The initial rerun showed corner updates at 2.3 → 2.7 ms and
hover delivery at 1.3 → 1.9 ms. An identical-source control using `cc5bfd1` on both sides still
showed hover delivery at 1.8 → 2.0 ms. That revealed a confound; it did not establish that every
observed difference was caused by the runner.

Each version/runtime now gets a fresh page per round. Both FrameKit pages execute the same
compatibility audit and scenario sequence. Version order still alternates and runtime scheduling
rotates. Fixture behavior, operation counts, warmups, timing boundaries, forced layout,
correctness assertions, and React's flushSync contract remain unchanged.

With isolation, the apparent corner regression disappeared (2.3 → 2.3 ms), as did the hover
regression (1.6 → 1.5 ms). Do not compare small absolute differences between the old and new
runner as library improvements; the execution history changed. The new report supersedes the
earlier mixed-page comparison.

## Identical-source control and tail follow-up

A full 23-case control compared `cc5bfd1` library source against itself with the new runner:
three rounds × 11 repetitions. It recorded reversal at 7.7 → 8.7 ms (+13%) and teardown p95
at 1.6 → 3.6 ms despite identical source. These show that a single positive delta can occur
without a regression; they are not a universal noise threshold.

The full baseline/current run flagged tails for dense rotation, small append, hover binding, and
hover delivery. Those four were rechecked with five rounds × 21 repetitions (105 samples per
version/scenario), again with isolated pages:

| Scenario                             | Before median | Current median | Median change | Before p95 | Current p95 | p95 change |
| ------------------------------------ | ------------: | -------------: | ------------: | ---------: | ----------: | ---------: |
| Rotate 5,000 of 5,000 rows           |           7.3 |            7.0 |         -4.1% |        8.9 |         8.6 |      -3.4% |
| Append 10 to a live 1,000-row layout |           0.5 |            0.3 |        -40.0% |        1.0 |         1.0 |      +0.0% |
| Subscribe 1,000 hover targets        |           0.5 |            0.5 |         +0.0% |        0.7 |         0.7 |      +0.0% |
| Deliver 1,000 hover events           |           2.4 |            1.9 |        -20.8% |        3.5 |         4.8 |     +37.1% |

The dense-rotation, small-append, and hover-binding tail increases from the full run did not
repeat. Hover delivery's p95 increase did repeat, with a larger absolute difference in the
follow-up. Its per-round p95 was higher in three rounds, lower in one, and equal in one; the
median was lower in four rounds and higher in one. The isolated identical-source full control
had hover p95 at 2.9 → 2.8 ms, while unrelated unchanged cases showed large tail variation.
The hover tail finding remains unresolved: a scheduling/GC explanation is plausible, but was
not established by profiling. No speculative runtime change was made to hide the result.

All runs completed the fixture assertions for committed DOM, geometry, identity, notifications,
and cleanup where relevant. No library code changed during this audit. Unit tests and the browser
correctness matrix were not repeated for these benchmark-only changes.

## Evidence and reproduction

- [Matched full-run samples](results.json) include every sample, per-round median, pooled p95,
  compatibility audit, environment, source revisions, and benchmark fingerprint.
- [Diagnostic samples](regression-controls.json) contain the initial mixed-page full rerun,
  mixed-page identical-source control, isolated full identical-source control, and isolated tail
  follow-up. Each retains its own methodology and fingerprint.

Run from the repository root with comparison dependencies installed:

```sh
node benchmarks/comparison/run.mjs --baseline 13bbf6d --rounds 5 --repetitions 11
node benchmarks/comparison/run.mjs --baseline cc5bfd1 --rounds 3 --repetitions 11 --out /tmp/control.json
node benchmarks/comparison/run.mjs --baseline 13bbf6d --cases rotate-5000,append-10,hover-bind,hover-dispatch --rounds 5 --repetitions 21 --out /tmp/tails.json
```

The identical-source command assumes library source is still unchanged from `cc5bfd1`; verify
that before interpreting it as a control. Old mixed-page diagnostics require the earlier runner.
Painting, memory retention, real pointer latency, other browsers, mobile devices, and full-app
responsiveness remain outside this timing matrix. No hardware timing budget was added to CI.

# Browser performance diagnostics

Run `npx playwright install chromium`, then `npm run benchmark`. This launches a local server,
uses one headless Chromium worker, and replaces `benchmarks/baseline.json` with measured results.
The report records the browser version, CPU, platform, timestamp, and repository revision. The
benchmark sources and pending working-tree changes also affect results; commit or record them
when comparing runs. Run with other heavy applications idle.

Synchronous workloads create, update, reverse, and destroy 1,000 and 5,000 rows. Results are
medians of five repetitions after a small warmup. Each phase forces layout with a geometry
read; these numbers include synchronous layout work, but do not measure painting. The FrameKit
case attaches its list layout after initial construction. The DOM baseline produces the same
visible geometry without FrameKit's validation, observation, animation ownership, or cleanup
contracts. It is a lower-cost reference, not a complete alternative implementation.

Animation diagnostics sample frame intervals while 300 objects rotate through 90 degrees over
500 ms. The FrameKit case uses linear tweens; the DOM case writes the same rotation directly
in a browser-frame loop. Both use identical FrameKit-created surfaces so the measured difference
is the update path. The small frame sample is diagnostic, not a statistically robust budget.

The virtual-list case loads 100,000 items, measures initialization and 30 scroll jumps, records
the maximum mounted option count, and verifies that teardown leaves no root DOM children.

## First measured baseline

See [baseline.json](baseline.json) for the environment and exact data. On the recorded Apple M5
and Chromium build:

|  Rows | Runtime  |  Create |  Update | Reverse | Destroy |
| ----: | -------- | ------: | ------: | ------: | ------: |
| 1,000 | FrameKit | 12.4 ms |  2.1 ms |  2.5 ms |  2.3 ms |
| 1,000 | DOM      |  1.4 ms |  1.2 ms |  1.2 ms |  0.1 ms |
| 5,000 | FrameKit | 58.1 ms | 14.8 ms | 15.0 ms | 12.6 ms |
| 5,000 | DOM      |  6.7 ms |  5.8 ms |  6.4 ms |  0.4 ms |

The virtual list kept at most **14 views** mounted, initialized in **19.3 ms**, and had a
**0.8 ms median** / **2.1 ms p95** scroll jump. Animation frame intervals had a **16.7 ms median**
for both paths, with **20.7 ms p95** for FrameKit and **17.6 ms p95** for direct DOM writes.

Creation and destruction have meaningful overhead, as expected from their additional contracts.
The synchronous costs scale roughly with row count in this workload. This does not establish a
need for a global batching API. Prefer bounded views, grouped property patches, and attaching
layout after bulk initial construction; measure application-specific update paths before changing
synchronous read and observer semantics. There are deliberately no hardware-dependent timing
assertions in CI. Browser correctness tests enforce the virtual-list DOM bound separately.

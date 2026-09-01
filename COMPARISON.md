# FrameKit and React

This is an honest comparison of FrameKit's current runtime with React. It is not a claim that one library is always faster than the other.

Measured on August 31, 2026 against React 19.2.8.

## Short answer

FrameKit is much smaller and gives direct, immediate control over persistent UI objects. React is currently faster at broad updates in the synthetic test below, and it has much stronger scheduling, server rendering, profiling, accessibility, and ecosystem support.

FrameKit is not a faster replacement for React today. It is a different model that is especially appealing for small and medium client-side interfaces, game-like UI, direct property mutation, and animation ownership.

## Measured size

| Build                              |      Raw |    Gzip |
| ---------------------------------- | -------: | ------: |
| FrameKit full ESM build            |  63.6 KB | 18.1 KB |
| Minimal FrameKit production bundle |  38.5 KB | 12.4 KB |
| Minimal React production bundle    | 193.4 KB | 60.2 KB |

The minimal FrameKit entry creates and mounts a `ScreenGui` containing a `Frame`, then changes one property. The minimal React entry uses `react`, `react-dom/client`, `createRoot`, and `useState` to render and update one `div`. Both were bundled and minified with the same local esbuild installation. FrameKit currently has no runtime package dependencies.

These numbers describe these exact entry points, not the size of every possible application. A real React framework may split code differently, while a larger FrameKit application will import more features.

## Browser runtime benchmark

The test creates 1,000 similarly styled boxes, updates every box, updates one box, and removes the tree. Each number is the median of 12 rounds in the same browser session.

| Operation              |               FrameKit |  React | Result                                            |
| ---------------------- | ---------------------: | -----: | ------------------------------------------------- |
| Create 1,000 boxes     |                 4.0 ms | 3.7 ms | Nearly tied                                       |
| Update all 1,000 boxes |                 1.8 ms | 0.6 ms | React about 3x faster                             |
| Update one box         | Below timer resolution | 0.4 ms | FrameKit has the shorter direct path in this test |
| Destroy the tree       |                 2.5 ms | 0.3 ms | React faster                                      |

React was run in production mode with `flushSync` so every measured update completed before the timer stopped. The React boxes used the same broad set of CSS properties as the FrameKit boxes. The test measures synchronous JavaScript and DOM work only. It does not measure layout, paint, network cost, user input responsiveness, application logic, or memory usage. Sub-millisecond results are too small for a strong conclusion.

This is a useful diagnostic, not an industry-grade verdict. FrameKit does not yet have an official repeatable benchmark suite.

## Why React wins the bulk update

React separates rendering from committing DOM changes. It can render a component tree, compare the result, and commit only the DOM changes that are needed. React also batches updates, and its current compiler can automatically memoize components and values. React transitions can schedule non-urgent work so that it is interruptible.

FrameKit avoids a virtual DOM and recursive component rerenders. A property assignment reaches the owned DOM node immediately. That path is pleasantly simple, but the current property renderer does more work than necessary: a change to one property causes the node's entire base style set, decorators, and layouts to be rendered again. The relevant paths are [`renderPropertyChanges`](src/shared/runtime/render.ts) and [`renderGuiObject`](src/core/gui-object.ts).

That behavior is the clearest current performance target. FrameKit should preserve direct assignment while writing only the CSS and derived state affected by the changed properties.

## Architecture comparison

| Area             | FrameKit today                                          | React today                                                               |
| ---------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| Update model     | Direct mutation of persistent objects                   | Components render descriptions that React reconciles                      |
| Timing           | Property writes are immediate                           | Updates are scheduled and commonly batched                                |
| Local update     | Very short path to one known DOM node                   | Goes through React scheduling and reconciliation                          |
| Broad update     | Repeats full per-node style work today                  | Efficient batching and minimal DOM commits                                |
| Animation        | Built-in springs and tweens with one owner per property | Animation is normally supplied by CSS or another library                  |
| Scheduling       | No concurrent or interruptible scheduler                | Transitions support non-blocking, interruptible rendering                 |
| Server rendering | Client only                                             | Server rendering, streaming, and hydration                                |
| Profiling        | Browser tools and application-specific measurement      | React DevTools performance tracks and the Profiler API                    |
| Large lists      | No virtualization built in                              | Usually handled with mature ecosystem libraries                           |
| Lifecycle        | Explicit ownership and recursive cleanup                | Effect cleanup and component unmount semantics                            |
| Ecosystem        | Small and purpose-built                                 | Very large ecosystem for routing, data, forms, testing, and accessibility |

## Where FrameKit is strongest

- Small bundle size.
- Direct and predictable property assignment.
- Persistent object identity that feels natural for engine-style UI.
- Springs and tweens share property ownership, so overlapping animations do not drift independently.
- Explicit cleanup: destroying an owner removes its descendants, listeners, bindings, and active animations.
- A focused API with no runtime dependencies.

## Where React is strongest

- Large trees and broad state changes.
- Scheduling work while keeping input responsive.
- Server rendering, streaming, hydration, and SEO-oriented applications.
- Mature profiling and debugging tools.
- Accessibility patterns and established component libraries.
- A much larger ecosystem and more production history.

## Memory and startup

FrameKit should have a startup advantage in small applications because much less JavaScript needs to be downloaded, parsed, and initialized. Its persistent instances, property snapshots, event signals, and bindings still consume memory, so "smaller bundle" does not automatically mean "less memory" in every application.

React keeps Fiber nodes and component state in addition to the DOM. FrameKit avoids Fiber, but it has not yet been measured against React with controlled heap snapshots. Any precise memory claim would be guesswork until that benchmark exists.

## Animation performance

FrameKit's animation ownership is a design advantage, not an automatic frame-rate advantage. Springs and tweens currently run from JavaScript animation frames. Animating layout properties can cause browser layout and paint work in either library. Transform and opacity animation paths are usually cheaper because browsers can often composite them.

FrameKit can improve this without splitting its public animation model: keep one animation owner per property, but allow the runtime to select a cheaper CSS or Web Animations path when a property and animation type can preserve the same behavior.

## Highest priority performance work

1. Add property-specific renderers so one property change does not rewrite every base style.
2. Add an explicit transaction or batch API for changes across many objects.
3. Create a repeatable benchmark suite for 1, 1,000, and 10,000 objects, including creation, one-object updates, bulk updates, list layout, text scaling, cleanup, and springs.
4. Add lightweight performance marks and FrameKit-specific profiling hooks.
5. Add virtualization for very large scrolling collections.
6. Investigate compositor-friendly animation paths while keeping the existing single-owner spring and tween behavior.
7. Add controlled heap and garbage-collection measurements before making memory claims.

## Practical choice

Choose FrameKit when the interface is client-side, benefits from direct engine-like objects, uses lots of owned animation, and values a small focused runtime.

Choose React when the application needs server rendering, a large ecosystem, sophisticated scheduling, mature profiling, or frequent broad tree updates.

For FrameKit itself, the next meaningful optimization is not a rewrite or a virtual DOM. It is a smaller render surface: update only what the changed property can affect, then add batching for callers that intentionally change many objects together.

## React references

- [React versions](https://react.dev/versions)
- [React render and commit](https://react.dev/learn/render-and-commit)
- [React Compiler introduction](https://react.dev/learn/react-compiler/introduction)
- [React `startTransition`](https://react.dev/reference/react/startTransition)
- [React DOM server APIs](https://react.dev/reference/react-dom/server)
- [React performance tracks](https://react.dev/reference/dev-tools/react-performance-tracks)
- [React component APIs, including Profiler](https://react.dev/reference/react/components)

import { assert, host } from '../case-support.js';
import { makeFixture } from '../fixtures.js';

export const lifetimeCases = [
  {
    id: 'hover-bind',
    label: 'Subscribe 1,000 hover targets',
    count: 1000,
    group: 'Lifetime',
    fresh: true,
    prepare: (runtime) => {
      const fixture = makeFixture(runtime, 1000);
      return {
        run: fixture.bindHover,
        verify: () => {
          fixture.dispatchHover();
          assert(fixture.hoverCalls() === 1000, 'Hover binding failed');
        },
        dispose: fixture.dispose,
      };
    },
  },
  {
    id: 'hover-dispatch',
    label: 'Deliver 1,000 hover events',
    count: 1000,
    group: 'Lifetime',
    prepare: (runtime) => {
      const fixture = makeFixture(runtime, 1000);
      fixture.bindHover();
      let expected = 0;
      return {
        run: fixture.dispatchHover,
        verify: () => {
          expected += 1000;
          assert(fixture.hoverCalls() === expected, 'Hover delivery failed');
        },
        dispose: fixture.dispose,
      };
    },
  },
  ...[
    ['destroy', 5000, 'rotation'],
    ['destroy-resources', 1000, 'resources'],
  ].map(([id, count, kind]) => ({
    id,
    label: id === 'destroy' ? 'Destroy 5,000 plain rows' : 'Destroy 1,000 subscribed hover targets',
    count,
    group: 'Lifetime',
    fresh: true,
    prepare: (runtime) => {
      const fixture = makeFixture(runtime, count, kind);
      const captured = Array.from(fixture.element().children);
      return {
        run: () => {
          fixture.dispose();
          host().getBoundingClientRect();
        },
        verify: () => {
          assert(host().childElementCount === 0, 'Root leaked');
          if (kind === 'resources') {
            assert(fixture.cleanups() === count, 'Owned resource cleanup failed');
          }
          captured.forEach((element) =>
            element.dispatchEvent(
              new MouseEvent(runtime === 'framekit' ? 'mouseenter' : 'mouseover', {
                bubbles: true,
              }),
            ),
          );
          assert(fixture.hoverCalls() === 0, 'Destroyed target delivered hover');
        },
        dispose: () => {},
      };
    },
  })),
  {
    id: 'cycles',
    label: '20 lifetimes × 100 subscribed rows',
    count: 100,
    group: 'Lifetime',
    fresh: true,
    prepare: (runtime) => {
      let cleaned = 0;
      return {
        run: () => {
          for (let index = 0; index < 20; index += 1) {
            const fixture = makeFixture(runtime, 100, 'resources');
            fixture.write(100, 1);
            fixture.dispose();
            cleaned += fixture.cleanups();
          }
          host().getBoundingClientRect();
        },
        verify: () =>
          assert(cleaned === 2000 && host().childElementCount === 0, 'Repeated lifetime leaked'),
        dispose: () => {},
      };
    },
  },
];

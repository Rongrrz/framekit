import { assert } from '../case-support.js';
import { makeFixture } from '../fixtures.js';

export const hierarchyCases = [
  {
    id: 'reverse',
    label: 'Reverse 5,000 keyed rows',
    count: 5000,
    group: 'Hierarchy',
    prepare: (runtime) => {
      const fixture = makeFixture(runtime, 5000);
      let before;
      return {
        before: () => {
          before = Array.from(fixture.element().children);
        },
        run: () => {
          fixture.reverse();
          fixture.flushLayout();
        },
        verify: () =>
          assert(
            Array.from(fixture.element().children).every(
              (child, index) => child === before[4999 - index],
            ),
            'Row identity lost',
          ),
        dispose: fixture.dispose,
      };
    },
  },
  ...[10, 100].map((amount) => ({
    id: `append-${amount}`,
    label: `Append ${amount} to a live 1,000-row layout`,
    count: 1000,
    group: 'Hierarchy',
    fresh: true,
    prepare: (runtime) => {
      const fixture = makeFixture(runtime, 1000);
      return {
        run: () => {
          fixture.add(amount);
          fixture.flushLayout();
        },
        verify: () =>
          assert(
            fixture.size() === 1000 + amount &&
              fixture.element().children.length === fixture.size(),
            'Append failed',
          ),
        dispose: fixture.dispose,
      };
    },
  })),
  {
    id: 'prepend-100',
    label: 'Prepend 100 to a live 1,000-row layout',
    count: 1000,
    group: 'Hierarchy',
    fresh: true,
    prepare: (runtime) => {
      const fixture = makeFixture(runtime, 1000);
      const original = Array.from(fixture.element().children);
      return {
        run: () => {
          fixture.add(100, true);
          fixture.flushLayout();
        },
        verify: () => {
          const rows = fixture.element().children;
          assert(rows.length === 1100 && fixture.size() === 1100, 'Prepend failed');
          assert(
            original.every((child, index) => rows[index + 100] === child),
            'Prepend lost row identity or order',
          );
          assert(
            Math.abs(
              original[0].getBoundingClientRect().top - rows[0].getBoundingClientRect().top - 1000,
            ) < 0.5,
            'Wrong prepend geometry',
          );
        },
        dispose: fixture.dispose,
      };
    },
  },
  {
    id: 'remove-100',
    label: 'Remove 100 from a live 1,100-row layout',
    count: 1100,
    group: 'Hierarchy',
    fresh: true,
    prepare: (runtime) => {
      const fixture = makeFixture(runtime, 1100);
      return {
        run: () => {
          fixture.remove(100);
          fixture.flushLayout();
        },
        verify: () =>
          assert(
            fixture.size() === 1000 && fixture.element().children.length === 1000,
            'Removal failed',
          ),
        dispose: fixture.dispose,
      };
    },
  },
  {
    id: 'remove-front-100',
    label: 'Remove first 100 from a live 1,100-row layout',
    count: 1100,
    group: 'Hierarchy',
    fresh: true,
    prepare: (runtime) => {
      const fixture = makeFixture(runtime, 1100);
      const retained = Array.from(fixture.element().children).slice(100);
      const top = fixture.element().firstElementChild.getBoundingClientRect().top;
      return {
        run: () => {
          fixture.remove(100, true);
          fixture.flushLayout();
        },
        verify: () => {
          const rows = fixture.element().children;
          assert(rows.length === 1000 && fixture.size() === 1000, 'Front removal failed');
          assert(
            retained.every((child, index) => rows[index] === child),
            'Removal lost row identity or order',
          );
          assert(
            Math.abs(rows[0].getBoundingClientRect().top - top) < 0.5,
            'Removed rows still take layout space',
          );
        },
        dispose: fixture.dispose,
      };
    },
  },
];

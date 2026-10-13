import { version as reactVersion } from 'react';

import { compatibilityAudit, makeFixture } from './fixtures.js';

const host = () => document.querySelector('#root');
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const round = (value) => Math.round(value * 1000) / 1000;
const updateCase = (id, label, count, changedCount, kind, value, separate = false) => ({
  id,
  label,
  count,
  group: 'Updates',
  prepare: (runtime) => {
    const fixture = makeFixture(runtime, count, kind);
    let iteration = 0;
    return {
      run: () => {
        fixture.write(changedCount, value(++iteration), separate);
        fixture.flushLayout();
      },
      verify: () => {
        const first = fixture.element().firstElementChild;
        const expected = value(iteration);
        if (kind === 'text') {
          assert(first.textContent === expected.text, 'Text not committed');
        } else if (kind === 'corner') {
          assert(first.style.borderRadius === `${expected.radius}px`, 'Corner not committed');
        } else {
          assert(
            first.style.rotate ===
              `${typeof expected === 'number' ? expected : expected.rotation}deg`,
            'Rotation not committed',
          );
          if (kind === 'observed') {
            assert(fixture.notifications() === iteration * changedCount, 'Wrong observer count');
          }
          if (typeof expected === 'object') {
            assert(first.style.height === `${expected.height}px`, 'Size not committed');
            const expectedStyle = document.createElement('div').style;
            expectedStyle.backgroundColor = `rgb(200 200 200 / ${1 - expected.transparency})`;
            assert(
              first.style.backgroundColor === expectedStyle.backgroundColor,
              'Transparency not committed',
            );
          }
          const lastChanged = fixture.element().children[changedCount - 1];
          assert(
            lastChanged.style.rotate === first.style.rotate,
            'Last requested rotation not committed',
          );
          if (changedCount < count) {
            assert(
              fixture.element().children[changedCount].style.rotate === '0deg',
              'Unrequested row changed',
            );
          }
        }
        assert(fixture.element().children.length === count, 'Unexpected row count');
      },
      dispose: fixture.dispose,
    };
  },
});

const cases = [
  ...[1000, 5000].map((count) => ({
    id: `create-${count}`,
    label: `Create ${count.toLocaleString()} rows`,
    count,
    group: 'Construction',
    fresh: true,
    prepare: (runtime) => {
      const fixture = makeFixture(runtime, 0, 'rotation', count);
      return {
        run: () => {
          fixture.add(count);
          fixture.flushLayout();
        },
        verify: () => {
          assert(fixture.element().children.length === count, 'Wrong construction count');
          const rows = fixture.element().children;
          assert(rows[0].getBoundingClientRect().height === 10, 'Wrong row height');
          assert(
            Math.abs(
              rows[count - 1].getBoundingClientRect().top -
                rows[0].getBoundingClientRect().top -
                (count - 1) * 10,
            ) < 0.5,
            'Wrong list geometry',
          );
        },
        dispose: fixture.dispose,
      };
    },
  })),
  ...[1, 10, 500, 5000].map((changed) =>
    updateCase(
      `rotate-${changed}`,
      `Rotate ${changed.toLocaleString()} of 5,000 rows`,
      5000,
      changed,
      'rotation',
      (index) => (index % 2) + 1,
    ),
  ),
  updateCase('noop', '5,000 no-op writes', 5000, 5000, 'rotation', () => 0),
  updateCase('patch', 'Three-property patch × 1,000', 1000, 1000, 'patch', (index) => ({
    height: (index % 2) + 10,
    rotation: (index % 2) + 1,
    transparency: (index % 2) / 2,
  })),
  updateCase(
    'separate',
    'Three direct setters × 1,000',
    1000,
    1000,
    'patch',
    (index) => ({
      height: (index % 2) + 10,
      rotation: (index % 2) + 1,
      transparency: (index % 2) / 2,
    }),
    true,
  ),
  updateCase('text', 'Update 1,000 text labels', 1000, 1000, 'text', (index) => ({
    text: `Row ${index}`,
  })),
  updateCase('corner', 'Update 1,000 corner modifiers', 1000, 1000, 'corner', (index) => ({
    radius: (index % 2) + 1,
  })),
  updateCase(
    'observed',
    '1,000 writes + committed-DOM observers',
    1000,
    1000,
    'observed',
    (index) => (index % 2) + 1,
  ),
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

window.comparisonCases = cases.map(({ id, label, count, group }) => ({ id, label, count, group }));
window.runComparisonCase = async (id, runtime, repetitions = 7) => {
  const definition = cases.find((entry) => entry.id === id);
  const samples = [];
  let scenario;
  try {
    for (let index = 0; index < repetitions + 2; index += 1) {
      if (!scenario || definition.fresh) {
        scenario = definition.prepare(runtime);
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
      scenario.before?.();
      const start = performance.now();
      scenario.run();
      const elapsed = performance.now() - start;
      scenario.verify();
      if (index >= 2) {
        samples.push(elapsed);
      }
      if (definition.fresh) {
        scenario.dispose();
        scenario = undefined;
      }
    }
  } finally {
    scenario?.dispose();
  }
  assert(host().childElementCount === 0, 'Case left root children');
  return {
    id,
    runtime,
    repetitions,
    medianMs: round(median(samples)),
    p95Ms: round([...samples].sort((a, b) => a - b)[Math.floor(samples.length * 0.95)]),
    samples,
  };
};
window.compatibilityAudit = compatibilityAudit;
window.comparisonEnvironment = { reactVersion, mode: import.meta.env.MODE };

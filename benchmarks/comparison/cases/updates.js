import { assert } from '../case-support.js';
import { makeFixture } from '../fixtures.js';

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

export const updatesCases = [
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
];

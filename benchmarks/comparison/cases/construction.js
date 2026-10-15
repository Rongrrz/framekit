import { assert } from '../case-support.js';
import { makeFixture } from '../fixtures.js';

export const constructionCases = [1000, 5000].map((count) => ({
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
}));

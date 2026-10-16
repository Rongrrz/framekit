import { expect, it } from 'vitest';

import { createRowGeometry } from '../../helpers/virtual-list-geometry.js';

it('maps fractional row boundaries and changed heights to scroll offsets', () => {
  const geometry = createRowGeometry([20, 35.5, 60, 24]);
  expect([0, 1, 2, 3, 4].map(geometry.offset)).toEqual([0, 20, 55.5, 115.5, 139.5]);
  expect([-1, 0, 19.9, 20, 55.5, 139.5, 200].map(geometry.indexAt)).toEqual([0, 0, 0, 1, 2, 3, 3]);
  geometry.set(1, 80);
  expect(geometry.offset(4)).toBe(184);
  expect(geometry.offset(2)).toBe(100);
  expect(geometry.indexAt(99)).toBe(1);
  expect(geometry.indexAt(100)).toBe(2);
  geometry.set(1, 10);
  expect(geometry.offset(4)).toBe(114);
  expect(geometry.indexAt(30)).toBe(2);
});

it('handles empty collections and the last row of a large collection', () => {
  const empty = createRowGeometry([]);
  expect(empty.offset(0)).toBe(0);
  expect(empty.indexAt(500)).toBe(0);

  const geometry = createRowGeometry(Array.from({ length: 100_000 }, () => 32));
  geometry.set(50_000, 64);
  expect(geometry.offset(100_000)).toBe(3_200_032);
  expect(geometry.indexAt(3_200_000)).toBe(99_999);
});

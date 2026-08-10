import { describe, expect, it } from 'vitest';

import { clampColor } from '../../utils/math';

describe('clampColor', () => {
  it('rounds values into the unsigned byte range', () => {
    expect(clampColor(-1)).toBe(0);
    expect(clampColor(12.6)).toBe(13);
    expect(clampColor(300)).toBe(255);
  });
});

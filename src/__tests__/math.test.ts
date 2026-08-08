import { describe, expect, it } from 'vitest';

import { MathUtils } from '../utils/MathUtils';

describe('MathUtils.clampColor', () => {
  it('rounds values into the unsigned byte range', () => {
    expect(MathUtils.clampColor(-1)).toBe(0);
    expect(MathUtils.clampColor(12.6)).toBe(13);
    expect(MathUtils.clampColor(300)).toBe(255);
  });
});

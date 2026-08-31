import { describe, expect, it } from 'vitest';

import { contentWidth, pageHeight, pageWidth } from '../src/layout';

describe('playground layout', () => {
  it('provides deliberate dimensions for every page and viewport', () => {
    for (const layout of ['mobile', 'desktop'] as const) {
      expect(contentWidth[layout]).toBeLessThan(pageWidth[layout]);
      expect(pageHeight[layout].home).toBeGreaterThan(1000);
      expect(pageHeight[layout].guide).toBeGreaterThan(pageHeight[layout].home);
      expect(pageHeight[layout].api).toBeGreaterThan(pageHeight[layout].guide);
    }
  });
});

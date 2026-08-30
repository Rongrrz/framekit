import { describe, expect, it } from 'vitest';

import { pageHeight, sectionLayout } from '../src/layout';

describe('playground layout', () => {
  it('keeps ordered section offsets and page height consistent for each viewport', () => {
    for (const layout of ['mobile', 'desktop'] as const) {
      let expectedTop = 0;

      for (const section of Object.values(sectionLayout[layout])) {
        expect(section.top).toBe(expectedTop);
        expectedTop += section.height;
      }

      expect(pageHeight[layout]).toBe(expectedTop);
    }
  });
});

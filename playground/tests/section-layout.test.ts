import { describe, expect, it } from 'vitest';

import { defineSectionLayout } from '../shared/section-layout';

describe('section layout', () => {
  it('derives offsets and page height from ordered section heights', () => {
    const layout = defineSectionLayout({ hero: 100, motion: 240, footer: 60 });

    expect(layout.sections).toEqual({
      hero: { top: 0, height: 100 },
      motion: { top: 100, height: 240 },
      footer: { top: 340, height: 60 },
    });
    expect(layout.pageHeight).toBe(400);
  });
});

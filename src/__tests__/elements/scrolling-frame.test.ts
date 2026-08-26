import { describe, expect, it, vi } from 'vitest';

import { fk } from '../..';
import { resetDocumentAfterEach } from '../helpers/reset-document';

const { canvasPosition, createScrollingFrame, destroy, scrollTo, update } = fk;

resetDocumentAfterEach();

describe('scrolling frames', () => {
  it('maps scrolling direction to native overflow', () => {
    const scrolling = createScrollingFrame({ ScrollingDirection: 'Y' });
    expect(scrolling.element.style.overflowX).toBe('hidden');
    expect(scrolling.element.style.overflowY).toBe('auto');
    update(scrolling, { ScrollingDirection: 'X' });
    expect(scrolling.element.style.overflowX).toBe('auto');
    expect(scrolling.element.style.overflowY).toBe('hidden');
  });

  it('reads and writes scrolling positions through lifecycle-aware helpers', () => {
    const scrolling = createScrollingFrame();
    scrolling.element.scrollLeft = 12;
    scrolling.element.scrollTop = 34;
    expect(canvasPosition(scrolling)).toEqual({ X: 12, Y: 34 });

    const nativeScrollTo = vi.fn();
    scrolling.element.scrollTo = nativeScrollTo;
    scrollTo(scrolling, { X: 56, Y: 78 });
    expect(nativeScrollTo).toHaveBeenCalledWith(56, 78);
    expect(fk.props(scrolling).CanvasPosition).toEqual(fk.vector2(56, 78));

    destroy(scrolling);
    expect(() => canvasPosition(scrolling)).toThrow(/destroyed/);
  });
});

import { describe, expect, it } from 'vitest';

import { fk } from '../../..';
import { resetDocumentAfterEach } from '../../support/reset-document';

const { createFrame, createUIAspectRatioConstraint, udim2FromOffset } = fk;
resetDocumentAfterEach();

describe('UI aspect ratio constraints', () => {
  it('fits within the requested size using the dominant axis', () => {
    const frame = createFrame({ Size: udim2FromOffset(200, 100) });
    const constraint = createUIAspectRatioConstraint();

    frame.addChild(constraint);

    expect(constraint).toMatchObject({
      AspectRatio: 1,
      AspectType: 'FitWithinMaxSize',
      DominantAxis: 'Width',
    });
    expect(frame.element.style.aspectRatio).toBe('1 / 1');
    expect(frame.element.style.width).toBe('200px');
    expect(frame.element.style.height).toBe('auto');
    expect(frame.element.style.maxWidth).toBe('200px');
    expect(frame.element.style.maxHeight).toBe('100px');

    constraint.setProperties({ AspectRatio: 2, DominantAxis: 'Height' });

    expect(frame.element.style.aspectRatio).toBe('2 / 1');
    expect(frame.element.style.width).toBe('auto');
    expect(frame.element.style.height).toBe('100px');

    constraint.removeFromParent();

    expect(frame.element.style.aspectRatio).toBe('');
    expect(frame.element.style.maxWidth).toBe('');
    expect(frame.element.style.maxHeight).toBe('');
    expect(frame.element.style.width).toBe('200px');
    expect(frame.element.style.height).toBe('100px');
  });

  it('can scale from its parent while maintaining the ratio', () => {
    const frame = createFrame();
    const constraint = createUIAspectRatioConstraint({
      AspectRatio: 16 / 9,
      AspectType: 'ScaleWithParentSize',
      DominantAxis: 'Height',
    });

    frame.addChild(constraint);

    expect(frame.element.style.aspectRatio).toBe(`${16 / 9} / 1`);
    expect(frame.element.style.width).toBe('auto');
    expect(frame.element.style.height).toBe('100%');
    expect(frame.element.style.maxWidth).toBe('100%');
    expect(frame.element.style.maxHeight).toBe('100%');
  });

  it('falls back to a square for invalid ratios', () => {
    const frame = createFrame();

    frame.addChild(createUIAspectRatioConstraint({ AspectRatio: 0 }));

    expect(frame.element.style.aspectRatio).toBe('1 / 1');
  });
});

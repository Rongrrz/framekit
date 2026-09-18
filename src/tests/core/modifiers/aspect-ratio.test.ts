import { describe, expect, it } from 'vitest';

import { fk } from '../../../index.js';
import { resetDocumentAfterEach } from '../../support/reset-document.js';

resetDocumentAfterEach();

describe('UI aspect ratio constraints', () => {
  it('fits within the requested size using the dominant axis', () => {
    const frame = fk.createFrame({ Size: fk.udim2FromOffset(200, 100) });
    const constraint = fk.createUIAspectRatioConstraint();

    constraint.Parent = frame;

    expect(constraint).toMatchObject({
      AspectRatio: 1,
      AspectType: 'FitWithinMaxSize',
      DominantAxis: 'Width',
    });
    expect(frame.unsafeElement.style.aspectRatio).toBe('1 / 1');
    expect(frame.unsafeElement.style.width).toBe('200px');
    expect(frame.unsafeElement.style.height).toBe('auto');
    expect(frame.unsafeElement.style.maxWidth).toBe('200px');
    expect(frame.unsafeElement.style.maxHeight).toBe('100px');

    constraint.setProperties({ AspectRatio: 2, DominantAxis: 'Height' });

    expect(frame.unsafeElement.style.aspectRatio).toBe('2 / 1');
    expect(frame.unsafeElement.style.width).toBe('auto');
    expect(frame.unsafeElement.style.height).toBe('100px');

    constraint.Parent = undefined;

    expect(frame.unsafeElement.style.aspectRatio).toBe('');
    expect(frame.unsafeElement.style.maxWidth).toBe('');
    expect(frame.unsafeElement.style.maxHeight).toBe('');
    expect(frame.unsafeElement.style.width).toBe('200px');
    expect(frame.unsafeElement.style.height).toBe('100px');
  });

  it('can scale from its parent while maintaining the ratio', () => {
    const frame = fk.createFrame();
    const constraint = fk.createUIAspectRatioConstraint({
      AspectRatio: 16 / 9,
      AspectType: 'ScaleWithParentSize',
      DominantAxis: 'Height',
    });

    constraint.Parent = frame;

    expect(frame.unsafeElement.style.aspectRatio).toBe(`${16 / 9} / 1`);
    expect(frame.unsafeElement.style.width).toBe('auto');
    expect(frame.unsafeElement.style.height).toBe('100%');
    expect(frame.unsafeElement.style.maxWidth).toBe('100%');
    expect(frame.unsafeElement.style.maxHeight).toBe('100%');
  });

  it('rejects non-positive ratios', () => {
    expect(() => fk.createUIAspectRatioConstraint({ AspectRatio: 0 })).toThrow(/positive finite/);
  });
});

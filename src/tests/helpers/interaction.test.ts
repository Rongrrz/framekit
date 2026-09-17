import { describe, expect, it } from 'vitest';

import { fk, fka, fkh } from '../../index';
import { setupAnimationClock } from '../support/animation-clock';

setupAnimationClock();

describe('hover scale', () => {
  it('controls an explicitly owned scale only while bound', () => {
    const frame = fk.createFrame();
    const scale = fk.createUIScale();
    frame.addChild(scale);
    const dispose = fkh.bindHoverScale(frame, scale, 1.05);

    frame.unsafeElement.dispatchEvent(new MouseEvent('mouseenter'));

    expect(fka.spring(scale).isAnimating()).toBe(true);

    dispose();
    frame.unsafeElement.dispatchEvent(new MouseEvent('mouseenter'));

    expect(scale.Parent).toBe(frame);
    expect(fka.spring(scale).isAnimating()).toBe(false);
    expect(scale.isDestroyed()).toBe(false);
    fka.spring(scale, { Scale: 2 });
    dispose();
    expect(fka.spring(scale).isAnimating()).toBe(true);
    expect(() => fkh.bindHoverScale(frame, scale, -1)).toThrow(/Hovered scale/);
    frame.destroy();
  });
});

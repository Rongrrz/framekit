import { describe, expect, it } from 'vitest';

import { fk, fka, fkh } from '../../index.js';
import { setupAnimationClock } from '../support/animation-clock.js';

const { settle } = setupAnimationClock();

describe('hover scale', () => {
  it('controls an explicitly owned scale only while bound', () => {
    const frame = fk.createFrame();
    const scale = fk.createUIScale();
    scale.Parent = frame;
    const dispose = fkh.bindHoverScale(frame, scale, 1.05);

    frame.unsafeElement.dispatchEvent(new MouseEvent('mouseenter'));

    expect(fka.spring(scale).isAnimating()).toBe(true);
    settle();
    expect(scale.Scale).toBe(1.05);
    frame.unsafeElement.dispatchEvent(new MouseEvent('mouseleave'));
    settle();
    expect(scale.Scale).toBe(1);
    frame.unsafeElement.dispatchEvent(new MouseEvent('mouseenter'));

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

  it('rejects scales that are detached or owned by another node', () => {
    const frame = fk.createFrame();
    const other = fk.createFrame();
    const scale = fk.createUIScale();
    expect(() => fkh.bindHoverScale(frame, scale)).toThrow(/attached/);
    scale.Parent = other;
    expect(() => fkh.bindHoverScale(frame, scale)).toThrow(/attached/);
    expect(scale.Parent).toBe(other);
    frame.destroy();
    other.destroy();
  });
});

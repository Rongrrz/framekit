import { describe, expect, it, vi } from 'vitest';

import { fk } from '../../index';
import { resetDocumentAfterEach } from '../support/reset-document';

resetDocumentAfterEach();

describe('GUI handles', () => {
  it('exposes hover events on non-button GUI nodes', () => {
    const frame = fk.createFrame();
    const gui = fk.createScreenGui();
    const entered = vi.fn();
    const left = vi.fn();

    frame.onMouseEnter(entered);
    frame.onMouseLeave(left);
    gui.onMouseEnter(entered);
    frame.element.dispatchEvent(new MouseEvent('mouseenter'));
    frame.element.dispatchEvent(new MouseEvent('mouseleave'));
    gui.element.dispatchEvent(new MouseEvent('mouseenter'));

    expect(entered).toHaveBeenCalledTimes(2);
    expect(left).toHaveBeenCalledOnce();
    expect('onClick' in frame).toBe(false);
    expect('onTextChanged' in frame).toBe(false);
  });

  it('reads browser-computed absolute geometry', () => {
    const frame = fk.createFrame();

    frame.element.getBoundingClientRect = () =>
      ({ left: 12, top: 34, width: 320, height: 180 }) as DOMRect;

    expect(frame.AbsolutePosition).toEqual(fk.vector2(12, 34));
    expect(frame.AbsoluteSize).toEqual(fk.vector2(320, 180));

    frame.destroy();

    expect(() => frame.AbsoluteSize).toThrow(/destroyed/);
  });
});

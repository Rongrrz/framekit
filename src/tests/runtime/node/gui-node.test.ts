import { createFrame, createScreenGui, vector2 } from 'framekit';
import { describe, expect, it, vi } from 'vitest';

import { resetDocumentAfterEach } from '../../support/reset-document.js';

resetDocumentAfterEach();

describe('GUI handles', () => {
  it('exposes properties as ordinary own accessors', () => {
    const frame = createFrame();
    const descriptor = Object.getOwnPropertyDescriptor(frame, 'Name');

    expect(Object.isFrozen(frame)).toBe(false);
    expect(Object.hasOwn(frame, 'Name')).toBe(true);
    expect(Object.hasOwn(frame, 'unsafeElement')).toBe(true);
    expect(frame).not.toHaveProperty('element');
    expect(Object.keys(frame)).toContain('Name');
    expect(descriptor?.get).toBeTypeOf('function');
    expect(descriptor?.set).toBeTypeOf('function');
  });

  it('exposes hover events on non-button GUI nodes', () => {
    const frame = createFrame();
    const gui = createScreenGui();
    const entered = vi.fn();
    const left = vi.fn();

    frame.onMouseEnter(entered);
    frame.onMouseLeave(left);
    gui.onMouseEnter(entered);
    frame.unsafeElement.dispatchEvent(new MouseEvent('mouseenter'));
    frame.unsafeElement.dispatchEvent(new MouseEvent('mouseleave'));
    gui.unsafeElement.dispatchEvent(new MouseEvent('mouseenter'));

    expect(entered).toHaveBeenCalledTimes(2);
    expect(left).toHaveBeenCalledOnce();
    expect('onClick' in frame).toBe(false);
    expect('onTextChanged' in frame).toBe(false);
  });

  it('reads browser-computed absolute geometry', () => {
    const frame = createFrame();

    frame.unsafeElement.getBoundingClientRect = () =>
      ({ left: 12, top: 34, width: 320, height: 180 }) as DOMRect;

    expect(frame.AbsolutePosition).toEqual(vector2(12, 34));
    expect(frame.AbsoluteSize).toEqual(vector2(320, 180));

    frame.destroy();

    expect(() => frame.AbsoluteSize).toThrow(/destroyed/);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import { fk, fkh } from '../..';

describe('public helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('binds a retained hover scale', () => {
    const frame = fk.createFrame();
    const scale = fkh.bindHoverScale(frame, 1.05);

    expect(scale.ClassName).toBe('UIScale');
    expect(scale.Parent).toBe(frame);
    expect(() => fkh.bindHoverScale(frame, -1)).toThrow(/Hovered scale/);
  });

  it('attaches and detaches a retained modifier from the requested parent', () => {
    const first = fk.createFrame({ Name: 'First' });
    const second = fk.createFrame({ Name: 'Second' });
    const shadow = fk.createUIShadow();

    fkh.setModifierAttached(first, shadow, true);

    expect(shadow.Parent).toBe(first);

    fkh.setModifierAttached(first, shadow, false);

    expect(shadow.Parent).toBeUndefined();
    expect(() => fkh.setModifierAttached(first, shadow, 'yes' as never)).toThrow(/Attached/);

    shadow.Parent = second;
    fkh.setModifierAttached(first, shadow, false);

    expect(shadow.Parent).toBe(second);
  });

  it('switches responsive layouts only when the breakpoint is crossed', () => {
    const owner = fk.createFrame();
    const mobile = vi.fn();
    const desktop = vi.fn();

    vi.stubGlobal('innerWidth', 640);
    fkh.bindResponsiveLayout(owner, {
      breakpoint: 700,
      mobile,
      desktop,
    });

    expect(mobile).toHaveBeenCalledOnce();
    expect(desktop).not.toHaveBeenCalled();

    vi.stubGlobal('innerWidth', 680);
    window.dispatchEvent(new Event('resize'));
    expect(mobile).toHaveBeenCalledOnce();

    vi.stubGlobal('innerWidth', 900);
    window.dispatchEvent(new Event('resize'));
    expect(desktop).toHaveBeenCalledOnce();

    owner.destroy();
    vi.stubGlobal('innerWidth', 500);
    window.dispatchEvent(new Event('resize'));
    expect(mobile).toHaveBeenCalledOnce();
  });
});

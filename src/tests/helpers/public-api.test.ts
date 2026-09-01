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

  it('creates a full-width vertical list that formats appended children', () => {
    const list = fkh.createAutoYScrollingFrame({
      viewportHeight: fk.udim(0.5, -20),
      gap: 12,
    });
    const first = fk.createFrame({
      Size: fk.udim2FromOffset(80, 32),
      Position: fk.udim2FromOffset(20, 40),
    });
    const second = fk.createFrame({ Size: fk.udim2FromOffset(60, 48) });

    list.addChild(first);
    list.addChild(second);

    expect(list.Size).toEqual(fk.udim2(1, 0, 0.5, -20));
    expect(list.ScrollingDirection).toBe('Y');
    expect(list.CanvasSize).toEqual(fk.udim2(1, 0, 0, 0));
    expect(list.AutomaticCanvasSize).toBe('Y');
    expect(list.element.style.display).toBe('flex');
    expect(list.element.style.flexDirection).toBe('column');
    expect(list.element.style.gap).toBe('12px');
    expect(first.element.style.position).toBe('relative');
    expect(first.element.style.left).toBe('auto');
    expect(first.element.style.top).toBe('auto');
    expect(first.element.style.width).toBe('100%');
    expect(first.element.style.height).toBe('32px');
    expect(second.element.style.width).toBe('100%');
    expect(second.element.style.height).toBe('48px');

    first.Size = fk.udim2FromOffset(20, 56);

    expect(first.element.style.width).toBe('100%');
    expect(first.element.style.height).toBe('56px');
  });

  it('rejects invalid automatic vertical list measurements', () => {
    expect(() =>
      fkh.createAutoYScrollingFrame({
        viewportHeight: { Scale: 0, Offset: Number.NaN },
      }),
    ).toThrow(/UDim offset/);
    expect(() =>
      fkh.createAutoYScrollingFrame({ viewportHeight: fk.udim(0, 200), gap: -1 }),
    ).toThrow(/Gap/);
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

  it('rejects destroyed responsive owners before applying a layout', () => {
    const owner = fk.createFrame();
    const mobile = vi.fn();
    const desktop = vi.fn();

    owner.destroy();

    expect(() =>
      fkh.bindResponsiveLayout(owner, {
        breakpoint: 700,
        mobile,
        desktop,
      }),
    ).toThrow(/destroyed/);
    expect(mobile).not.toHaveBeenCalled();
    expect(desktop).not.toHaveBeenCalled();
  });

  it('does not retain a resize listener when the initial layout destroys its owner', () => {
    const owner = fk.createFrame();
    const mobile = vi.fn(() => owner.destroy());
    const desktop = vi.fn();

    vi.stubGlobal('innerWidth', 640);
    fkh.bindResponsiveLayout(owner, {
      breakpoint: 700,
      mobile,
      desktop,
    });

    vi.stubGlobal('innerWidth', 900);
    window.dispatchEvent(new Event('resize'));

    expect(mobile).toHaveBeenCalledOnce();
    expect(desktop).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi, afterEach } from 'vitest';

import { fk, fkh } from '../../index';

afterEach(() => vi.unstubAllGlobals());

describe('responsive layouts', () => {
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

import { describe, expect, it, vi, afterEach } from 'vitest';

import { fk, fkh } from '../../index.js';

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

    vi.stubGlobal('innerWidth', 700);
    window.dispatchEvent(new Event('resize'));
    expect(desktop).toHaveBeenCalledOnce();
    vi.stubGlobal('innerWidth', 900);
    window.dispatchEvent(new Event('resize'));
    expect(desktop).toHaveBeenCalledOnce();
    vi.stubGlobal('innerWidth', 699);
    window.dispatchEvent(new Event('resize'));
    expect(mobile).toHaveBeenCalledTimes(2);

    owner.destroy();
    vi.stubGlobal('innerWidth', 900);
    window.dispatchEvent(new Event('resize'));
    expect(mobile).toHaveBeenCalledTimes(2);
    expect(desktop).toHaveBeenCalledOnce();
  });

  it('uses the owner document viewport rather than the global window', () => {
    const iframe = document.body.appendChild(document.createElement('iframe'));
    const ownerDocument = iframe.contentDocument!;
    const ownerWindow = ownerDocument.defaultView!;
    const owner = fk.createFrame({}, { ownerDocument });
    const mobile = vi.fn();
    const desktop = vi.fn();
    vi.stubGlobal('innerWidth', 1200);
    Object.defineProperty(ownerWindow, 'innerWidth', { configurable: true, value: 400 });
    fkh.bindResponsiveLayout(owner, { breakpoint: 700, mobile, desktop });
    expect(mobile).toHaveBeenCalledOnce();
    expect(desktop).not.toHaveBeenCalled();
    Object.defineProperty(ownerWindow, 'innerWidth', { configurable: true, value: 700 });
    ownerWindow.dispatchEvent(new ownerWindow.Event('resize'));
    expect(desktop).toHaveBeenCalledOnce();
    owner.destroy();
    iframe.remove();
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

  it('stops responding when explicitly disposed without destroying its owner', () => {
    const owner = fk.createFrame();
    const mobile = vi.fn();
    const desktop = vi.fn();
    vi.stubGlobal('innerWidth', 640);
    const dispose = fkh.bindResponsiveLayout(owner, { breakpoint: 700, mobile, desktop });

    dispose();
    dispose();
    vi.stubGlobal('innerWidth', 900);
    window.dispatchEvent(new Event('resize'));

    expect(owner.isDestroyed()).toBe(false);
    expect(mobile).toHaveBeenCalledOnce();
    expect(desktop).not.toHaveBeenCalled();
    owner.destroy();
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

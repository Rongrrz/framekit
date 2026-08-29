import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDesktopApp } from '../desktop/app';
import { createMobileApp } from '../mobile/app';
import { createResponsivePlayground } from '../responsive-app';

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('device applications', () => {
  it('composes the shared story with device-specific section views', () => {
    const desktop = createDesktopApp();
    const mobile = createMobileApp();

    expect(desktop.findFirstChild('Motion', true)).toBeDefined();
    expect(mobile.findFirstChild('MobileMotion', true)).toBeDefined();

    desktop.destroy();
    mobile.destroy();
  });

  it('switches persistent device presentations at the responsive breakpoint', () => {
    vi.stubGlobal('innerWidth', 900);
    const playground = createResponsivePlayground();
    playground.mount(document.body);

    const [desktop, mobile] = document.querySelectorAll<HTMLElement>('[data-framekit="ScreenGui"]');

    expect(desktop?.style.display).toBe('');
    expect(mobile?.style.display).toBe('none');

    vi.stubGlobal('innerWidth', 640);
    window.dispatchEvent(new Event('resize'));

    expect(desktop?.style.display).toBe('none');
    expect(mobile?.style.display).toBe('');

    vi.stubGlobal('innerWidth', 680);
    window.dispatchEvent(new Event('resize'));

    expect(desktop?.style.display).toBe('none');
    expect(mobile?.style.display).toBe('');

    playground.destroy();
    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();
  });

  it('keeps a forced preview layout independent of viewport changes', () => {
    vi.stubGlobal('innerWidth', 900);
    const playground = createResponsivePlayground('mobile');
    playground.mount(document.body);

    const [desktop, mobile] = document.querySelectorAll<HTMLElement>('[data-framekit="ScreenGui"]');

    window.dispatchEvent(new Event('resize'));

    expect(desktop?.style.display).toBe('none');
    expect(mobile?.style.display).toBe('');

    playground.destroy();
  });
});

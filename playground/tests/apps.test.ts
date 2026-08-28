import { afterEach, describe, expect, it } from 'vitest';

import { createDesktopApp } from '../desktop/app';
import { createMobileApp } from '../mobile/app';

afterEach(() => document.body.replaceChildren());

describe('device applications', () => {
  it('compose the shared story with device-specific section views', () => {
    const desktop = createDesktopApp();
    const mobile = createMobileApp();

    expect(desktop.findFirstChild('Motion', true)).toBeDefined();
    expect(mobile.findFirstChild('MobileMotion', true)).toBeDefined();

    desktop.destroy();
    mobile.destroy();
  });
});

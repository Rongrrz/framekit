import { expect, test as base, type Page } from '@playwright/test';

import type {} from './harness.js';

export { expect };
export type { Page };

export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));
    await use(page);
    expect(errors, 'Unexpected browser errors').toEqual([]);
  },
});

export const openFrameKit = async (page: Page): Promise<void> => {
  await page.goto('/tests/browser/index.html');
  await page.waitForFunction(() => Boolean(window.framekit));
};

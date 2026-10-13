import { expect, test } from '@playwright/test';

import type {} from './harness.js';

test('scaled text still fits after resize and restores its explicit size when disabled', async ({
  page,
}) => {
  await page.goto('/tests/browser/index.html');
  await page.waitForFunction(() => Boolean(window.framekit));
  const result = await page.evaluate(async () => {
    const { createScreenGui, createTextLabel, udim2FromOffset } = window.framekit;
    const gui = createScreenGui();
    const label = createTextLabel({
      Text: 'Example label',
      TextScaled: true,
      TextSize: 19,
      FontFamily: 'monospace',
      Size: udim2FromOffset(200, 40),
    });
    label.Parent = gui;
    gui.mount('#root');
    const text = label.unsafeElement.querySelector<HTMLElement>('[data-framekit-text]')!;
    const settle = () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    await settle();
    const large = Number.parseInt(text.style.fontSize, 10);
    label.Size = udim2FromOffset(100, 40);
    await settle();
    const small = Number.parseInt(text.style.fontSize, 10);
    const fits =
      text.scrollWidth <= text.clientWidth + 1 && text.scrollHeight <= text.clientHeight + 1;
    label.TextScaled = false;
    label.Text = 'Updated without scaling';
    const explicit = text.style.fontSize;
    label.Text = '';
    label.TextScaled = true;
    const empty = text.style.fontSize;
    gui.destroy();
    return { large, small, fits, explicit, empty };
  });
  expect(result.small).toBeGreaterThan(0);
  expect(result.large).toBeGreaterThan(result.small);
  expect(result.fits).toBe(true);
  expect(result.explicit).toBe('19px');
  expect(result.empty).toBe('19px');
});

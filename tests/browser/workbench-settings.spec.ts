import { expect, test } from '@playwright/test';

import { chooseDropdown } from './workbench-helpers';

for (const viewport of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'compact', width: 375, height: 480 },
]) {
  test(`Settings keeps a stable size with independently scrolling tabs on ${viewport.name} screens`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/project-workbench/');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
    const initial = (await dialog.boundingBox())!;
    expect(initial.width).toBeLessThanOrEqual(Math.min(560, viewport.width - 24));
    expect(initial.height).toBeLessThanOrEqual(Math.min(640, viewport.height - 32));

    if (viewport.name === 'desktop') {
      expect(initial.width).toBe(560);
      expect(initial.height).toBe(640);
    }

    const close = dialog.getByRole('button', { name: 'Close settings', exact: true });
    const closeBounds = await close.boundingBox();
    const footer = dialog.getByText('Preferences save automatically in this browser.', {
      exact: true,
    });
    const footerBounds = await footer.boundingBox();

    for (const name of ['Appearance', 'Workspace', 'Canvas']) {
      await dialog.getByRole('tab', { name, exact: true }).click();
      expect(await dialog.boundingBox()).toEqual(initial);
      await expect(dialog.getByRole('tabpanel', { name, exact: true })).toBeVisible();
    }

    const canvas = dialog.getByRole('tabpanel', { name: 'Canvas', exact: true });
    const zoom = canvas.getByRole('button', { name: 'Canvas zoom', exact: true });
    await zoom.scrollIntoViewIfNeeded();
    await expect(zoom).toBeInViewport();

    if (viewport.name === 'compact') {
      expect(await canvas.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    }

    expect(await dialog.boundingBox()).toEqual(initial);
    expect(await close.boundingBox()).toEqual(closeBounds);
    expect(await footer.boundingBox()).toEqual(footerBounds);
    await chooseDropdown(dialog, 'Canvas zoom', '50%');
    await dialog.getByRole('tab', { name: 'Appearance', exact: true }).click();
    await dialog.getByRole('tab', { name: 'Canvas', exact: true }).click();
    await expect(zoom).toHaveText('50%');
    expect(await dialog.boundingBox()).toEqual(initial);
    await page.screenshot({ path: `/tmp/framekit-settings-fixed-${viewport.name}.png` });

    await page.setViewportSize({ width: viewport.width, height: 360 });
    await expect.poll(async () => (await dialog.boundingBox())!.height).toBeLessThanOrEqual(328);
    await expect(close).toBeInViewport();
    await expect(footer).toBeInViewport();
    await zoom.scrollIntoViewIfNeeded();
    await expect(zoom).toBeInViewport();
    await close.click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused();
  });
}

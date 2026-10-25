import { expect, test } from '@playwright/test';

import { chooseDropdown, createProject } from './workbench-helpers';

test('presents exact selected resolutions, rotates and resizes without restarting project scripts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/project-workbench/');
  await createProject(page, 'Task board');
  await chooseDropdown(page, 'Canvas resolution', 'Phone · 390 × 844 px · Portrait');
  await expect(page.getByRole('button', { name: 'Canvas orientation', exact: true })).toContainText(
    'Portrait',
  );
  await page.screenshot({ path: '/tmp/framekit-resolution-editor.png' });
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  const frame = page.frameLocator('iframe[title="Presented project"]');
  const viewport = async (): Promise<readonly number[]> =>
    frame.locator('body').evaluate(() => [window.innerWidth, window.innerHeight]);
  await expect.poll(viewport).toEqual([390, 844]);
  await expect(page.locator('[data-presentation-resolution]')).toContainText(
    '390 × 844 px · Portrait',
  );
  await frame
    .getByRole('textbox', { name: 'New task', exact: true })
    .fill('Keeps running through resize');
  await frame.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(frame.getByText('13 tasks · 0 completed', { exact: true })).toBeVisible();
  const iframe = await page.locator('iframe[title="Presented project"]').elementHandle();
  await chooseDropdown(page, 'Presentation orientation', 'Landscape');
  await expect.poll(viewport).toEqual([844, 390]);
  await expect(frame.getByText('13 tasks · 0 completed', { exact: true })).toBeVisible();
  await chooseDropdown(page, 'Presentation resolution', 'Full HD · 1920 × 1080 px · Landscape');
  await expect.poll(viewport).toEqual([1920, 1080]);
  await chooseDropdown(page, 'Presentation scale', 'Actual size · 100%');
  await expect.poll(async () => (await page.locator('iframe').boundingBox())!.width).toBe(1920);
  await chooseDropdown(page, 'Presentation scale', 'Fit to window');
  await expect
    .poll(async () => (await page.locator('iframe').boundingBox())!.width)
    .toBeLessThan(1440);
  expect(
    await page.locator('iframe').evaluate((element, previous) => element === previous, iframe),
  ).toBe(true);
  await chooseDropdown(page, 'Presentation resolution', /Custom device/);
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await expect(settings).toBeVisible();
  await page.getByRole('textbox', { name: 'Custom preview width', exact: true }).fill('800');
  await page.getByRole('textbox', { name: 'Custom preview width', exact: true }).press('Enter');
  await page.getByRole('textbox', { name: 'Custom preview height', exact: true }).fill('600');
  await page.getByRole('textbox', { name: 'Custom preview height', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await expect.poll(viewport).toEqual([800, 600]);
  await expect(frame.getByText('13 tasks · 0 completed', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await expect.poll(viewport).toEqual([800, 600]);
  await expect
    .poll(async () => (await page.locator('iframe').boundingBox())!.width)
    .toBeLessThanOrEqual(343);
  await page.screenshot({ path: '/tmp/framekit-resolution-present-mobile.png' });
  await page.getByRole('button', { name: 'Exit presentation', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Canvas', exact: true }).click();
  await expect(page.locator('[data-workbench-canvas]')).toHaveCSS('width', '800px');
});

test('resolution dropdowns support keyboard selection, exact dimensions and persisted orientation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/project-workbench/');
  await createProject(page, 'Blank canvas');
  await chooseDropdown(page, 'Canvas resolution', 'Desktop · 1440 × 900 px · Landscape');
  const orientation = page.getByRole('button', { name: 'Canvas orientation', exact: true });
  await orientation.press('ArrowDown');
  await page.getByRole('menuitem', { name: 'Portrait', exact: true }).press('Enter');
  await expect(orientation).toContainText('Portrait');
  await expect(orientation).toBeFocused();
  await expect(page.locator('[data-workbench-canvas]')).toHaveCSS('width', '900px');
  await expect(page.locator('[data-workbench-canvas]')).toHaveCSS('height', '1440px');
  await page.reload();
  await expect(orientation).toContainText('Portrait');
  await expect(page.getByRole('button', { name: 'Canvas resolution', exact: true })).toContainText(
    'Desktop · 900 × 1440 px · Portrait',
  );
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Canvas', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('tab', { name: 'Appearance', exact: true }).click();
  await chooseDropdown(page, 'Workbench theme', 'Light');
  await page.screenshot({ path: '/tmp/framekit-settings-dropdowns-light.png' });
});

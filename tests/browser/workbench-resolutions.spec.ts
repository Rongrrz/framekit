import { expect, test } from '@playwright/test';

import { chooseDropdown, createProject } from './workbench-helpers';

test('100% zoom keeps both dimensions at one CSS pixel per project pixel with reachable edges', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/project-workbench/');
  await createProject(page, 'Welcome card');
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  const iframe = page.locator('iframe[title="Presented project"]');
  const frame = page.frameLocator('iframe[title="Presented project"]');
  const viewport = page.getByRole('region', { name: 'Presentation viewport', exact: true });
  await expect(frame.locator('[data-framekit="ScreenGui"]')).toBeVisible();
  await chooseDropdown(page, 'Presentation zoom', '100% zoom');
  for (const resolution of [
    { label: 'Default preview · 960 × 640 px · Landscape', width: 960, height: 640 },
    { label: 'Full HD · 1920 × 1080 px · Landscape', width: 1920, height: 1080 },
    { label: '4K UHD · 3840 × 2160 px · Landscape', width: 3840, height: 2160 },
    { label: 'Phone · 390 × 844 px · Portrait', width: 390, height: 844 },
  ]) {
    await chooseDropdown(page, 'Presentation resolution', resolution.label);
    await expect
      .poll(async () => {
        const bounds = (await iframe.boundingBox())!;
        return { width: bounds.width, height: bounds.height };
      })
      .toEqual({ width: resolution.width, height: resolution.height });
    await expect
      .poll(() =>
        frame.locator('body').evaluate(() => ({ width: innerWidth, height: innerHeight })),
      )
      .toEqual({ width: resolution.width, height: resolution.height });
    await expect
      .poll(async () => {
        const visible = (await viewport.boundingBox())!;
        const project = (await iframe.boundingBox())!;
        return project.x >= visible.x && project.y >= visible.y;
      })
      .toBe(true);
    await viewport.evaluate((element) => {
      element.scrollTo(element.scrollWidth, element.scrollHeight);
    });
    await expect
      .poll(async () => {
        const visible = (await viewport.boundingBox())!;
        const project = (await iframe.boundingBox())!;
        return (
          project.x + project.width <= visible.x + visible.width &&
          project.y + project.height <= visible.y + visible.height
        );
      })
      .toBe(true);

    if (resolution.width === 1920) {
      await chooseDropdown(page, 'Presentation zoom', 'Fit to window');
      await expect
        .poll(() =>
          viewport.evaluate((element) => ({
            width: element.scrollWidth - element.clientWidth,
            height: element.scrollHeight - element.clientHeight,
          })),
        )
        .toEqual({ width: 0, height: 0 });
      await expect(iframe).toBeInViewport({ ratio: 1 });
      await chooseDropdown(page, 'Presentation zoom', '100% zoom');
      await viewport.evaluate((element) => {
        element.scrollTo(element.scrollWidth, element.scrollHeight);
      });
    }
  }
  await page.screenshot({ path: '/tmp/framekit-presentation-100-percent.png' });
});

test.describe('Retina presentation', () => {
  test.use({ deviceScaleFactor: 2 });

  test('4K dimensions and content sizes match between the editor and presentation at 100% zoom', async ({
    page,
  }) => {
    await page.goto('/project-workbench/');
    await createProject(page, 'Welcome card');
    await chooseDropdown(page, 'Canvas resolution', '4K UHD · 3840 × 2160 px · Landscape');
    await chooseDropdown(page, 'Canvas zoom', '100%');
    const canvas = page.locator('[data-workbench-canvas]');
    await expect
      .poll(async () => {
        const bounds = (await canvas.boundingBox())!;
        return { width: bounds.width, height: bounds.height };
      })
      .toEqual({ width: 3840, height: 2160 });
    const headline = (await page.locator('[data-scene-id="headline"]').boundingBox())!;
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    await chooseDropdown(page, 'Presentation zoom', '100% zoom');
    const frame = page.frameLocator('iframe[title="Presented project"]');
    await expect
      .poll(() =>
        frame.locator('body').evaluate(() => ({ width: innerWidth, height: innerHeight })),
      )
      .toEqual({ width: 3840, height: 2160 });
    await expect
      .poll(async () => {
        const bounds = (await page.locator('iframe[title="Presented project"]').boundingBox())!;
        return { width: bounds.width, height: bounds.height };
      })
      .toEqual({ width: 3840, height: 2160 });
    const presentedHeadline = frame.getByText('Make something persistent.', { exact: true });
    await expect
      .poll(async () => {
        const bounds = (await presentedHeadline.boundingBox())!;
        return { width: bounds.width, height: bounds.height };
      })
      .toEqual({ width: headline.width, height: headline.height });
    await expect(page.locator('[data-presentation-resolution]')).toHaveText(
      '3840 × 2160 px · Landscape · 100% zoom',
    );
    await chooseDropdown(page, 'Presentation zoom', 'Fit to window');
    await expect
      .poll(
        async () => (await page.locator('iframe[title="Presented project"]').boundingBox())!.width,
      )
      .toBeLessThan(3840);
    await expect
      .poll(() =>
        frame.locator('body').evaluate(() => ({ width: innerWidth, height: innerHeight })),
      )
      .toEqual({ width: 3840, height: 2160 });
  });
});

test('presents exact selected resolutions, rotates and resizes without restarting project scripts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/project-workbench/');
  await createProject(page, 'Task board');
  await chooseDropdown(page, 'Canvas resolution', 'Phone · 390 × 844 px · Portrait');
  await expect(page.getByRole('button', { name: 'Canvas resolution', exact: true })).toContainText(
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
  await chooseDropdown(page, 'Presentation resolution', 'Phone · 844 × 390 px · Landscape');
  await expect.poll(viewport).toEqual([844, 390]);
  await expect(frame.getByText('13 tasks · 0 completed', { exact: true })).toBeVisible();
  await chooseDropdown(page, 'Presentation resolution', 'Full HD · 1920 × 1080 px · Landscape');
  await expect.poll(viewport).toEqual([1920, 1080]);
  await chooseDropdown(page, 'Presentation zoom', '100% zoom');
  await expect.poll(async () => (await page.locator('iframe').boundingBox())!.width).toBe(1920);
  await chooseDropdown(page, 'Presentation zoom', 'Fit to window');
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
  const resolution = page.getByRole('button', { name: 'Canvas resolution', exact: true });
  await resolution.press('ArrowDown');
  await page
    .getByRole('menuitem', { name: 'Desktop · 900 × 1440 px · Portrait', exact: true })
    .press('Enter');
  await expect(resolution).toContainText('Portrait');
  await expect(resolution).toBeFocused();
  await expect(page.locator('[data-workbench-canvas]')).toHaveCSS('width', '900px');
  await expect(page.locator('[data-workbench-canvas]')).toHaveCSS('height', '1440px');
  await page.reload();
  await expect(resolution).toContainText('Portrait');
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

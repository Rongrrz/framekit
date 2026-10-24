import { expect, test } from '@playwright/test';

import { chooseDropdown, createProject } from './workbench-helpers';

test('persists the chrome theme without recoloring the authored project or losing dynamic controls', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/project-workbench/index.html');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Appearance', exact: true }).click();
  await chooseDropdown(page, 'Workbench theme', 'Light');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Projects home' })).toHaveCSS(
    'background-color',
    'rgb(243, 244, 246)',
  );

  await createProject(page, 'Welcome card');
  const card = page.locator('[data-scene-id="card"]');
  await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.getByRole('treeitem', { name: 'Headline', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveCSS(
    'background-color',
    'rgb(248, 250, 252)',
  );
  await page.reload();
  await expect(page.locator('[data-workbench-theme]')).toHaveAttribute(
    'data-workbench-theme',
    'light',
  );
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Appearance', exact: true }).click();
  await chooseDropdown(page, 'Workbench theme', 'Dark');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  expect(errors).toEqual([]);
});

test('quantizes canvas movement at fractional zoom and persists decimal precision', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/project-workbench/index.html');
  await createProject(page, 'Welcome card');
  const drag = async (): Promise<void> => {
    const bounds = (await page.locator('[data-scene-id="headline"]').boundingBox())!;
    await page.mouse.move(bounds.x + 80, bounds.y + 20);
    await page.mouse.down();
    await page.mouse.move(bounds.x + 103, bounds.y + 37, { steps: 5 });
    await page.mouse.up();
  };
  await drag();
  const offset = page.getByRole('textbox', { name: 'Position X offset', exact: true });
  await expect(offset).toHaveValue(/^-?\d+$/);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await chooseDropdown(page, 'Position precision', 'One decimal');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await drag();
  await expect(offset).toHaveValue(/^-?\d+(\.\d)?$/);
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Position precision', exact: true })).toContainText(
    'One decimal',
  );
});

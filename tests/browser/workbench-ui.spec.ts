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
  const settingsIcon = page.getByRole('button', { name: 'Settings', exact: true });
  await expect
    .poll(() =>
      settingsIcon.evaluate((element) => getComputedStyle(element, '::after').backgroundColor),
    )
    .toBe('rgb(28, 36, 48)');
  await expect(page.getByRole('region', { name: 'Projects home' })).toHaveCSS(
    'background-color',
    'rgb(243, 244, 246)',
  );

  await createProject(page, 'Welcome card');
  await expect(page.getByRole('region', { name: 'Design canvas', exact: true })).toHaveCSS(
    'background-color',
    'rgb(243, 244, 246)',
  );
  const card = page.locator('[data-scene-id="card"]');
  await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.getByRole('treeitem', { name: 'Headline', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveCSS(
    'background-color',
    'rgb(248, 250, 252)',
  );
  await page.screenshot({ path: '/tmp/framekit-editor-redesign-light.png' });
  await page.reload();
  await expect(page.locator('[data-workbench-theme]')).toHaveAttribute(
    'data-workbench-theme',
    'light',
  );
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Appearance', exact: true }).click();
  await chooseDropdown(page, 'Workbench theme', 'Dark');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await expect
    .poll(() =>
      settingsIcon.evaluate((element) => getComputedStyle(element, '::after').backgroundColor),
    )
    .toBe('rgb(238, 237, 242)');
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: 'Present', exact: true })
        .evaluate((element) => getComputedStyle(element, '::after').backgroundColor),
    )
    .toBe('rgb(17, 18, 22)');
  await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  expect(errors).toEqual([]);
});

test('command search exposes descriptions, runs from the keyboard and restores its opener', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/project-workbench/');
  await createProject(page, 'Welcome card');
  const commands = page.getByRole('button', { name: 'Commands', exact: true });
  await commands.click();
  const search = page.getByRole('textbox', { name: 'Search commands', exact: true });
  await search.fill('duplicate');
  const dialog = page.getByRole('dialog', { name: 'Commands', exact: true });
  await expect(dialog.getByText('Ctrl/Cmd D', { exact: true })).toBeVisible();
  await page.screenshot({ path: '/tmp/framekit-command-search-redesign.png' });
  await search.press('Enter');
  await expect(
    page.getByRole('treeitem', { name: 'Welcome card copy', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await commands.click();
  await search.fill('no such command');
  await expect(dialog.getByText('No matching commands.', { exact: true })).toBeVisible();
  await search.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(commands).toBeFocused();
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
  await page.getByRole('button', { name: 'Select tool', exact: true }).click();
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

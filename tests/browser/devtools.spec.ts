import { expect, test, type Page } from '@playwright/test';

import type {} from './harness.js';

const inspectorFor = (page: Page) =>
  page.getByRole('complementary', { name: 'FrameKit runtime inspector' });

test('opens /fkdebug on demand and preserves the live app through browser Back and Forward', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/playground/workbench.html');
  await expect(inspectorFor(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Add card', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Keep this card');
  await page.getByRole('button', { name: 'Debug', exact: true }).click();
  await expect(page).toHaveURL(/\/fkdebug$/);
  const inspector = inspectorFor(page);
  await expect(inspector).toBeVisible();
  await expect(
    inspector.getByRole('searchbox', { name: 'Search runtime hierarchy' }),
  ).toBeFocused();
  await page.goBack();
  await expect(inspector).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
    'Keep this card',
  );
  await page.goForward();
  await expect(inspector).toBeVisible();
  await page.getByRole('button', { name: 'Close runtime inspector' }).click();
  await expect(page).toHaveURL(/\/playground\/workbench.html$/);
  await expect(inspector).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('searches collapsed paths, navigates ancestors and selection history, and filters readable properties', async ({
  page,
}, info) => {
  await page.goto('/fkdebug');
  const inspector = inspectorFor(page);
  const search = inspector.getByRole('searchbox', { name: 'Search runtime hierarchy' });
  const tree = inspector.getByRole('tree', { name: 'Runtime hierarchy' });
  await search.fill('Preview:title');
  const row = tree.getByRole('treeitem', { name: 'Preview:title (TextButton)', exact: true });
  await expect(row).toBeVisible();
  await row.focus();
  await page.keyboard.press('Enter');
  await expect(inspector).toContainText('Class: TextButton');
  await expect(search).toHaveValue('Preview:title');
  const properties = inspector.getByRole('searchbox', { name: 'Filter runtime properties' });
  await properties.fill('BackgroundColor3');
  await expect(
    inspector.getByRole('group', { name: 'BackgroundColor3: #76EDAD', exact: true }),
  ).toBeVisible();
  await properties.fill('no such property');
  await expect(inspector.getByText('No matching properties', { exact: true })).toBeVisible();
  await properties.fill('');
  const parent = inspector
    .getByRole('navigation', { name: 'Instance ancestors' })
    .getByRole('button')
    .last();
  await parent.click();
  await expect(inspector).toContainText('Class: Frame');
  await inspector.getByRole('button', { name: 'Previous inspected instance' }).click();
  await expect(inspector).toContainText('Class: TextButton');
  await inspector.getByRole('button', { name: 'Next inspected instance' }).click();
  await expect(inspector).toContainText('Class: Frame');
  await search.fill('');
  await inspector.getByRole('button', { name: 'Collapse all nodes' }).click();
  await expect(tree.getByRole('treeitem')).toHaveCount(1);
  await search.fill('Preview:title');
  await expect(row).toBeVisible();
  await row.click();
  await search.fill('');
  await page.screenshot({ path: info.outputPath('inspector-desktop.png') });
});

test('picks elements without activating app commands and releases picking when closed', async ({
  page,
}) => {
  await page.goto('/fkdebug');
  const inspector = inspectorFor(page);
  await inspector.getByRole('separator', { name: 'Resize runtime inspector' }).focus();
  await page.keyboard.press('Home');
  await expect(inspector.getByRole('tab', { name: 'Hierarchy', exact: true })).toBeVisible();
  const pick = inspector.getByRole('button', { name: 'Pick an element' });
  await pick.click();
  await expect(pick).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Select Explore', exact: true }).click();
  await expect(pick).toHaveAttribute('aria-pressed', 'false');
  await expect(inspector).toContainText('Preview:primary');
  // Picking must not change the workbench's model selection.
  await expect(
    page
      .getByRole('tree', { name: 'Objects' })
      .getByRole('treeitem', { name: 'Welcome', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await pick.click();
  await page.keyboard.press('Escape');
  await expect(pick).toHaveAttribute('aria-pressed', 'false');
  await pick.click();
  await inspector.getByRole('button', { name: 'Close runtime inspector' }).click();
  await expect(inspector).toHaveCount(0);
  await page.getByRole('button', { name: 'Select Explore', exact: true }).click();
  await expect(
    page
      .getByRole('tree', { name: 'Objects' })
      .getByRole('treeitem', { name: 'Explore', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
});

test('resizes with keyboard and pointer, and uses navigable tabs on a compact screen', async ({
  page,
}, info) => {
  await page.goto('/fkdebug');
  const inspector = inspectorFor(page);
  const separator = inspector.getByRole('separator', { name: 'Resize runtime inspector' });
  await separator.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(separator).toHaveAttribute('aria-valuenow', '704');
  const before = await inspector.boundingBox();
  const bounds = await separator.boundingBox();
  await page.mouse.move(bounds!.x + 5, bounds!.y + 60);
  await page.mouse.down();
  await page.mouse.move(bounds!.x - 43, bounds!.y + 60, { steps: 4 });
  await page.mouse.up();
  const after = await inspector.boundingBox();
  expect(after!.width).toBeGreaterThan(before!.width + 40);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(inspector.getByRole('tab', { name: 'Hierarchy', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await inspector
    .getByRole('searchbox', { name: 'Search runtime hierarchy' })
    .fill('Preview:title');
  await inspector
    .getByRole('treeitem', { name: 'Preview:title (TextButton)', exact: true })
    .click();
  const detailTab = inspector.getByRole('tab', { name: 'Details', exact: true });
  await expect(detailTab).toHaveAttribute('aria-selected', 'true');
  await expect(
    inspector.getByRole('searchbox', { name: 'Filter runtime properties' }),
  ).toBeVisible();
  const compact = await inspector.boundingBox();
  expect(compact!.x).toBeGreaterThanOrEqual(0);
  expect(compact!.x + compact!.width).toBeLessThanOrEqual(391);
  await page.screenshot({ path: info.outputPath('inspector-mobile.png') });
  await detailTab.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(inspector.getByRole('tab', { name: 'Hierarchy', exact: true })).toBeFocused();
  await expect(inspector.getByRole('tree', { name: 'Runtime hierarchy' })).toBeVisible();
});

test('supports direct /fkdebug navigation and refresh, then exits without losing the app', async ({
  page,
}) => {
  await page.goto('/fkdebug');
  await expect(inspectorFor(page)).toBeVisible();
  await page.reload();
  await expect(inspectorFor(page)).toBeVisible();
  await inspectorFor(page)
    .getByRole('searchbox', { name: 'Search runtime hierarchy' })
    .press('Escape');
  await expect(inspectorFor(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/workbench.html$/);
  await page.getByRole('button', { name: 'Add card', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Card 1');
});

test('the same route controller inspects an independent FrameKit project and releases on root destruction', async ({
  page,
}) => {
  await page.goto('/tests/browser/index.html');
  await page.waitForFunction(() => Boolean(window.framekitDevtools));
  await page.evaluate(() => {
    const { createScreenGui, createTextButton, createUICorner, udim2FromOffset } = window.framekit;
    const app = createScreenGui({ Name: 'Independent project' });
    const child = createTextButton({
      Name: 'SubmitOrder',
      Text: 'Submit',
      Size: udim2FromOffset(120, 40),
    });
    child.Parent = app;
    const corner = createUICorner({ Name: 'RoundCorners', CornerRadius: 8 });
    corner.Parent = child;
    const remove = createTextButton({
      Text: 'Remove corner',
      Position: udim2FromOffset(140, 0),
      Size: udim2FromOffset(120, 40),
    });
    remove.Parent = app;
    remove.onClick(() => corner.destroy());
    child.on('click', () => app.destroy());
    app.mount('#root');
    window.framekitDevtools.bindRuntimeInspectorRoute(app).open();
  });
  const inspector = inspectorFor(page);
  await expect(page).toHaveURL(/\/fkdebug$/);
  await expect(
    inspector.getByRole('treeitem', { name: 'Independent project (ScreenGui)', exact: true }),
  ).toBeVisible();
  await inspector.getByRole('searchbox', { name: 'Search runtime hierarchy' }).fill('RoundCorners');
  await inspector.getByRole('treeitem', { name: 'RoundCorners (UICorner)', exact: true }).click();
  await expect(inspector).toContainText('Class: UICorner');
  await page.getByRole('button', { name: 'Remove corner', exact: true }).click();
  await expect(inspector).toContainText('Class: ScreenGui');
  await expect(
    inspector.getByRole('treeitem', { name: 'RoundCorners (UICorner)', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(inspector).toHaveCount(0);
  expect(
    await page
      .locator('style')
      .evaluateAll((styles) =>
        styles.some((style) => style.textContent?.includes('[data-fk-debug-panel]')),
      ),
  ).toBe(false);
});

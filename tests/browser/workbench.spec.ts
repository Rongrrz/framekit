import { expect, test } from '@playwright/test';

const errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/playground/workbench.html');
  await expect(page.getByRole('tree', { name: 'Objects' })).toBeVisible();
});
test.afterEach(() => {
  expect(errors).toEqual([]);
});

test('creates, edits, searches, deletes, and restores a design object', async ({ page }) => {
  await page.getByRole('button', { name: 'Add card', exact: true }).click();
  const name = page.getByRole('textbox', { name: 'Name', exact: true });
  await expect(name).toHaveValue('Card 1');
  await name.fill('My card');
  await name.press('Enter');
  await expect(page.getByRole('treeitem', { name: 'My card', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select My card' })).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'Search objects' });
  await search.fill('My card');
  await expect(page.getByRole('treeitem')).toHaveCount(3);
  await search.fill('');
  await page.getByRole('treeitem', { name: 'My card', exact: true }).click();
  await page.keyboard.press('Delete');
  await expect(page.getByRole('treeitem', { name: 'My card', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('treeitem', { name: 'My card', exact: true })).toBeVisible();
});

test('drags a preview card with one undo step and resizes panels with the keyboard', async ({
  page,
}) => {
  const card = page.getByRole('button', { name: 'Select Welcome' });
  const before = await card.boundingBox();
  if (!before) {
    throw new Error('Missing card bounds');
  }
  await page.mouse.move(before.x + 30, before.y + 30);
  await page.mouse.down();
  await page.mouse.move(before.x + 90, before.y + 60, { steps: 6 });
  await page.mouse.up();
  const after = await card.boundingBox();
  expect(after!.x).toBeGreaterThan(before.x + 40);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  const restored = await card.boundingBox();
  expect(restored!.x).toBeCloseTo(before.x, 0);
  const divider = page.getByRole('separator', { name: 'Resize objects panel' });
  await divider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(divider).toHaveAttribute('aria-valuenow', '256');
});

test('opens keyboard context actions and preserves the focused row through reordering', async ({
  page,
}) => {
  const tree = page.getByRole('tree', { name: 'Objects' });
  await tree.getByRole('treeitem', { name: 'Explore', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+F10');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('menuitem', { name: 'Move down' }).click();
  const names = await tree
    .getByRole('treeitem')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));
  expect(names.indexOf('Create')).toBeLessThan(names.indexOf('Explore'));
  await page.getByRole('button', { name: 'Actions', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Actions', exact: true })).toBeFocused();
});

test('renders the desktop workbench and a compact viewport', async ({ page }, info) => {
  await page.screenshot({ path: info.outputPath('workbench-desktop.png') });
  await page.setViewportSize({ width: 800, height: 700 });
  await expect(page.getByRole('tree', { name: 'Objects' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select Welcome' })).toBeVisible();
  await page.getByRole('button', { name: 'Properties', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Properties', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Properties', exact: true })).toBeHidden();
});

import { expect, test } from '@playwright/test';

test('inspects a live hierarchy without blocking the application and closes cleanly', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/playground/workbench.html?inspect=1');
  const inspector = page.getByRole('complementary', { name: 'FrameKit runtime inspector' });
  await expect(inspector).toBeVisible();
  const tree = inspector.getByRole('tree', { name: 'Runtime hierarchy' });
  await expect(tree.getByRole('treeitem').first()).toContainText('Workbench');
  await page.getByRole('button', { name: 'Add card', exact: true }).click();
  await expect(tree.getByRole('treeitem').filter({ hasText: 'Preview:object-1' })).toBeVisible();
  await tree.getByRole('treeitem').filter({ hasText: 'Preview:object-1' }).click();
  await expect(inspector).toContainText('Class: TextButton');
  await page.getByRole('button', { name: 'Close runtime inspector' }).click();
  await expect(inspector).toHaveCount(0);
  await expect(page.getByRole('tree', { name: 'Objects' })).toBeVisible();
  expect(errors).toEqual([]);
});

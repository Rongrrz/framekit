import { expect, test } from '@playwright/test';

import { createProject } from './workbench-helpers';

test('keeps long menus inside short landscape screens and scrolls keyboard targets into view', async ({
  page,
}) => {
  await page.setViewportSize({ width: 700, height: 360 });
  await page.goto('/project-workbench/');
  await createProject(page, 'Welcome card');
  await page.getByRole('button', { name: 'Explorer', exact: true }).click();
  const actions = page.getByRole('button', { name: 'Explorer actions', exact: true });
  await actions.click();
  const menu = page.getByRole('menu');
  const bounds = (await menu.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(360);
  await page.keyboard.press('End');
  const collapse = menu.getByRole('menuitem', { name: 'Collapse all', exact: true });
  await expect(collapse).toBeFocused();
  const target = (await collapse.boundingBox())!;
  expect(target.y).toBeGreaterThanOrEqual(bounds.y);
  expect(target.y + target.height).toBeLessThanOrEqual(bounds.y + bounds.height);
  await page.keyboard.press('Enter');
  await expect(menu).toBeHidden();
  await expect(actions).toBeFocused();
  await expect(page.getByRole('treeitem', { name: 'Welcome card', exact: true })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

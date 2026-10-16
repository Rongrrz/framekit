import { expect, test } from '@playwright/test';

test('documents working menu, modal, tree, and explicit binding cleanup on desktop and mobile', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/playground/index.html#/controls');
  await expect(
    page.getByRole('heading', { name: 'Menus, dialogs & trees', exact: true }),
  ).toBeVisible();

  const trigger = page.getByRole('button', { name: 'Example actions', exact: true });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Copy item' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Archive item' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('status').filter({ hasText: 'Archive item selected.' }),
  ).toBeVisible();
  await expect(trigger).toBeFocused();

  const opener = page.getByRole('button', { name: 'Open example dialog', exact: true });
  await opener.click();
  await expect(page.getByRole('dialog', { name: 'Example dialog', exact: true })).toBeVisible();

  const bounds = await page
    .getByRole('dialog', { name: 'Example dialog', exact: true })
    .boundingBox();

  expect(Math.abs(bounds!.x + bounds!.width / 2 - page.viewportSize()!.width / 2)).toBeLessThan(2);
  expect(Math.abs(bounds!.y + bounds!.height / 2 - page.viewportSize()!.height / 2)).toBeLessThan(
    2,
  );
  await expect(page.getByRole('button', { name: 'Close example dialog' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();

  const tree = page.getByRole('tree', { name: 'Example files' });
  await tree.getByRole('treeitem', { name: 'Project', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(tree.getByRole('treeitem', { name: 'Readme', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(tree.getByRole('treeitem')).toHaveCount(1);
  await page.keyboard.press('ArrowRight');
  await expect(tree.getByRole('treeitem')).toHaveCount(3);
  await tree.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('controls-desktop.png') });
  await page.setViewportSize({ width: 390, height: 900 });
  await opener.click();
  await expect(page.getByRole('dialog', { name: 'Example dialog', exact: true })).toBeVisible();

  const mobileBounds = await page
    .getByRole('dialog', { name: 'Example dialog', exact: true })
    .boundingBox();

  expect(Math.abs(mobileBounds!.x + mobileBounds!.width / 2 - 195)).toBeLessThan(2);
  expect(Math.abs(mobileBounds!.y + mobileBounds!.height / 2 - 450)).toBeLessThan(2);
  await page.screenshot({ path: info.outputPath('controls-mobile-dialog.png') });
  await page.getByRole('button', { name: 'Close example dialog' }).click();
  await page.getByRole('button', { name: 'Release example bindings' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Bindings released; content remains.' }),
  ).toBeVisible();
  await expect(trigger).toBeDisabled();
  await expect(opener).toBeDisabled();
  await expect(page.getByRole('tree')).toHaveCount(0);
  expect(
    await page
      .getByRole('main')
      .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
  ).toBe(true);
  expect(errors).toEqual([]);
});

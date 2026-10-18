import { expect, test } from './fixtures.js';

test('virtualizes 100,000 items with bounded DOM, keyboard selection, and stable scroll anchors', async ({
  page,
}) => {
  await page.goto('/playground/collections.html');

  const list = page.getByRole('listbox', { name: 'Virtual collection' });
  await expect(list.getByRole('option', { name: 'Row 0', exact: true })).toBeVisible();
  expect(await list.getByRole('option').count()).toBeLessThan(32);
  await list.focus();
  await page.keyboard.press('End');
  await expect(list.getByRole('option', { name: 'Row 99,999' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(list).toBeFocused();
  expect(await list.getByRole('option').count()).toBeLessThan(32);
  await page.keyboard.press('Home');
  await page.keyboard.press('PageDown');

  const before = await list.evaluate((element) => ({
    top: element.scrollTop,
    active: element.getAttribute('aria-activedescendant'),
  }));

  await page.getByRole('button', { name: 'Insert at top' }).click();

  const after = await list.evaluate((element) => ({
    top: element.scrollTop,
    active: element.getAttribute('aria-activedescendant'),
  }));

  expect(after.top).toBe(before.top + 32);
  expect(after.active).toBe(before.active);
});

test('keeps native focus on the viewport when the selected option scrolls out of view', async ({
  page,
}) => {
  await page.goto('/playground/collections.html');

  const list = page.getByRole('listbox');
  await list.focus();
  await list.evaluate((element) => {
    element.scrollTop = 10_000;
  });
  await expect(list).not.toHaveAttribute('aria-activedescendant');
  await expect(list).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(list.getByRole('option', { name: 'Row 1', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(list).toBeFocused();
});

import { expect, test } from '@playwright/test';

import { createProject } from './workbench-helpers';

test('presents a live isolated project across the viewport and exits with Escape', async ({
  page,
}) => {
  await page.goto('/project-workbench/');
  await createProject(page, 'Interactive counters');
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Presentation', exact: true });
  const frame = page.frameLocator('iframe[title="Presented project"]');
  await expect(frame.getByRole('button', { name: '+ Add one', exact: true })).toHaveCount(2, {
    timeout: 20000,
  });
  await frame.getByRole('button', { name: '+ Add one', exact: true }).first().click();
  await expect(
    frame.getByText('The left prefab emitted CountChanged.', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('iframe[title="Presented project"]')).toHaveAttribute(
    'sandbox',
    'allow-scripts',
  );
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('iframe[title="Presented project"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await expect(frame.getByRole('button', { name: '+ Add one', exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Exit presentation', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

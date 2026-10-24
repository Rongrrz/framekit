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

test('dashboard navigation changes content and its activity feed scrolls', async ({ page }) => {
  await page.goto('/project-workbench/');
  await createProject(page, 'Dashboard');
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  const frame = page.frameLocator('iframe[title="Presented project"]');
  await frame.getByRole('button', { name: 'Analytics', exact: true }).click();
  await expect(frame.getByText('8,410', { exact: true })).toBeVisible();
  await frame.getByRole('button', { name: 'Projects', exact: true }).click();
  await expect(frame.getByText('Your projects', { exact: true })).toBeVisible();
  const feed = frame.locator('[data-framekit="ScrollingFrame"]').first();
  expect(await feed.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await feed.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(frame.getByText(/Documentation\s+In progress/)).toBeVisible();
});

test('settings template validates inputs, toggles notifications and confirms a save', async ({
  page,
}) => {
  await page.goto('/project-workbench/');
  await createProject(page, 'Settings panel');
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  const frame = page.frameLocator('iframe[title="Presented project"]');
  await frame.getByRole('button', { name: 'Save preferences →', exact: true }).click();
  await expect(
    frame.getByText('Enter your name and a valid email address.', { exact: true }),
  ).toHaveCount(1);
  await frame.getByRole('textbox', { name: 'Display name', exact: true }).fill('Alex');
  await frame.getByRole('textbox', { name: 'Email address', exact: true }).fill('alex@example.com');
  await frame.getByRole('button', { name: 'Toggle notifications', exact: true }).click();
  await frame.getByRole('button', { name: 'Save preferences →', exact: true }).click();
  await expect(frame.getByText('Saved for Alex · Notifications off', { exact: true })).toHaveCount(
    1,
  );
});

test('task board scrolls, adds tasks, completes them and clears completed items', async ({
  page,
}) => {
  await page.goto('/project-workbench/');
  await createProject(page, 'Task board');
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  const frame = page.frameLocator('iframe[title="Presented project"]');
  await frame
    .getByRole('textbox', { name: 'New task', exact: true })
    .fill('Make the template work');
  await frame.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(frame.getByText('13 tasks · 0 completed', { exact: true })).toBeVisible();
  const added = frame.getByRole('button', { name: 'Make the template work', exact: true });
  await added.click();
  await expect(added).toHaveAttribute('aria-pressed', 'true');
  await expect(frame.getByText('13 tasks · 1 completed', { exact: true })).toBeVisible();
  await frame.getByRole('button', { name: 'Clear completed', exact: true }).click();
  await expect(added).toHaveCount(0);
  await expect(frame.getByText('12 tasks · 0 completed', { exact: true })).toBeVisible();
});

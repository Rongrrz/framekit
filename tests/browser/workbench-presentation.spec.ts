import { expect, test } from '@playwright/test';

import { createProject, expectWorker } from './workbench-helpers';

test('runs internal handlers before instance handlers, isolates nested outputs and restores design values', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/project-workbench/');
  const project = await page.evaluate(async () => {
    const editorPath = '/project-workbench/src/editor.ts';
    const { createEditor }: typeof import('../../project-workbench/src/editor') = await import(
      /* @vite-ignore */ editorPath
    );
    const editor = createEditor();
    editor.select('button');
    const button = editor.createPrefab('Action');
    editor.openPrefab(button);
    editor.setEvents(['Pressed']);
    editor.connect({
      id: 'change-button',
      source: 'button',
      event: 'Activated',
      action: { type: 'set', target: 'button', property: 'Text', value: 'Internal handler ran' },
    });
    editor.connect({
      id: 'emit',
      source: 'button',
      event: 'Activated',
      action: { type: 'emit', event: 'Pressed' },
    });
    editor.openPrefab(null);
    editor.connect({
      id: 'read-button',
      source: 'button',
      event: 'Activated',
      action: { type: 'copyText', source: 'button', target: 'headline' },
    });
    editor.connect({
      id: 'receive-output',
      source: 'button',
      event: 'Pressed',
      action: { type: 'set', target: 'feature-title', property: 'Text', value: 'Output received' },
    });
    editor.select('card');
    const panel = editor.createPrefab('Panel');
    editor.select(null);
    editor.insertPrefab(panel);
    editor.edit(editor.state.get().selectedId!, 'Position', {
      X: { Scale: 0, Offset: 960 },
      Y: { Scale: 0, Offset: 48 },
    });
    editor.configure({ width: 1920, height: 720 });
    return editor.state.get().project;
  });
  const choosing = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import project', exact: true }).click();
  const chooser = await choosing;
  await chooser.setFiles({
    name: 'nested-events.framekit.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  const frame = page.frameLocator('iframe[title="Presented project"]');
  const buttons = frame.getByRole('button');
  await expectWorker(buttons).toHaveCount(2);
  await buttons.first().click();
  await expect(frame.getByText('Internal handler ran', { exact: true })).toHaveCount(2);
  await expect(frame.getByText('Output received', { exact: true })).toHaveCount(1);
  await expect(frame.getByText('Make something persistent.', { exact: true })).toHaveCount(1);
  await expect(frame.getByText('A canvas with a memory.', { exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Exit presentation', exact: true }).click();
  const design = page.getByRole('region', { name: 'Design canvas', exact: true });
  await expect(design.getByText('Make something persistent.', { exact: true })).toHaveCount(2);
  await expect(design.getByText('A canvas with a memory.', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await expectWorker(frame.getByText('Make something persistent.', { exact: true })).toHaveCount(2);
  await expect(frame.getByText('Output received', { exact: true })).toHaveCount(0);
});

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

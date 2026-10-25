import { readFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import type { SavedProject } from '../../project-workbench/src/projects';
import { createProject } from './workbench-helpers';

const savedProjects = async (page: Page): Promise<readonly SavedProject[]> =>
  page.evaluate(() => JSON.parse(localStorage.getItem('framekit-workbench-projects-v1') ?? '[]'));

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/project-workbench/');
});

test('backs up the whole project from prefab editing and imports independent editable copies', async ({
  page,
}) => {
  await createProject(page, 'Welcome card');
  await page.getByRole('treeitem', { name: 'Feature panel', exact: true }).click();
  await page.getByRole('button', { name: '+ Insert', exact: true }).click();
  await page.getByRole('button', { name: 'Add Script', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'TypeScript source', exact: true })
    .fill("export default () => { document.body.dataset.restored = 'yes'; };");
  await page
    .getByRole('textbox', { name: 'Allowed backend origins', exact: true })
    .fill('https://api.framekit.test');
  await page.getByRole('button', { name: 'Apply script', exact: true }).click();
  await page.getByRole('button', { name: 'Prefabs tab', exact: true }).click();
  await page.getByRole('button', { name: 'Edit prefab Primary button', exact: true }).click();
  const [original] = await savedProjects(page);
  expect(original!.document.prefabs!.length).toBeGreaterThan(0);
  expect(original!.document.bindings!.length).toBeGreaterThan(0);
  expect(original!.document.nodes.some((node) => node.type === 'Script')).toBe(true);

  await page.getByRole('button', { name: 'Commands', exact: true }).click();
  const search = page.getByRole('textbox', { name: 'Search commands', exact: true });
  await search.fill('Download project backup');
  const downloading = page.waitForEvent('download');
  await search.press('Enter');
  const backup = await downloading;
  expect(backup.suggestedFilename()).toBe('first-canvas.framekit.json');
  const path = (await backup.path())!;
  expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(original!.document);

  await page.getByRole('button', { name: 'Back to projects', exact: true }).click();
  await page
    .getByRole('button', { name: `Options for ${original!.document.name}`, exact: true })
    .click();
  const libraryDownload = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Download project backup', exact: true }).click();
  const libraryBackup = await libraryDownload;
  const libraryPath = (await libraryBackup.path())!;
  expect(JSON.parse(await readFile(libraryPath, 'utf8'))).toEqual(original!.document);

  for (let count = 2; count <= 3; count += 1) {
    const choosing = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import project', exact: true }).click();
    await (await choosing).setFiles(path);
    await expect(page.getByRole('region', { name: 'Projects home' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
    await expect(page.locator('[data-scene-id="headline"]')).toContainText(
      'Make something persistent.',
    );
    const projects = await savedProjects(page);
    expect(projects).toHaveLength(count);
    expect(new Set(projects.map((project) => project.id)).size).toBe(count);
    expect(projects.at(-1)!.document).toEqual(original!.document);
    await page.getByRole('button', { name: 'Back to projects', exact: true }).click();
  }

  await page.reload();
  await expect(page.locator('[data-project-row]')).toHaveCount(3);
});

test('rejects malformed, unsupported, invalid hierarchy and oversized imports without changing saved projects', async ({
  page,
}) => {
  await createProject(page, 'Welcome card');
  await page.getByRole('button', { name: 'Back to projects', exact: true }).click();
  const original = await savedProjects(page);
  const invalidHierarchy = structuredClone(original[0]!.document);
  const invalid = {
    ...invalidHierarchy,
    nodes: invalidHierarchy.nodes.map((node, index) =>
      index === 0 ? { ...node, parent: 'missing-parent' } : node,
    ),
  };

  for (const source of [
    '{broken',
    JSON.stringify({ ...original[0]!.document, version: 99 }),
    JSON.stringify(invalid),
    ' '.repeat(5_000_001),
  ]) {
    const choosing = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import project', exact: true }).click();
    const chooser = await choosing;
    await chooser.setFiles({
      name: 'invalid.framekit.json',
      mimeType: 'application/json',
      buffer: Buffer.from(source),
    });
    await expect(page.getByRole('status')).toContainText('Could not import project.');
    await expect(page.getByRole('region', { name: 'Projects home' })).toBeVisible();
    expect(await savedProjects(page)).toEqual(original);
    await expect(
      page.getByRole('button', { name: `Open ${original[0]!.document.name}`, exact: true }),
    ).toBeVisible();
  }
});

test('opens templates directly from Commands and keeps the current project when canceled', async ({
  page,
}) => {
  await createProject(page, 'Welcome card');
  const originalURL = page.url();
  const commands = page.getByRole('button', { name: 'Commands', exact: true });

  const openTemplates = async (): Promise<void> => {
    await commands.click();
    const search = page.getByRole('textbox', { name: 'Search commands', exact: true });
    await search.fill('New project from template');
    await search.press('Enter');
    await expect(page.getByRole('dialog', { name: 'New project', exact: true })).toBeVisible();
  };

  await openTemplates();
  await page.keyboard.press('Escape');
  await expect(commands).toBeFocused();
  expect(page.url()).toBe(originalURL);
  expect(await savedProjects(page)).toHaveLength(1);
  await expect(page.locator('[data-scene-id="headline"]')).toBeVisible();

  await openTemplates();
  await page.getByRole('button', { name: 'Create Blank canvas', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'New project', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  expect(await savedProjects(page)).toHaveLength(2);
  expect(page.url()).not.toBe(originalURL);
});

test('keeps project import and creation reachable on compact screens', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const importProject = page.getByRole('button', { name: 'Import project', exact: true });
  await expect(importProject).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeInViewport();
  const choosing = page.waitForEvent('filechooser');
  await importProject.click();
  await (
    await choosing
  ).setFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  });
  await expect(page.getByRole('status')).toContainText('Could not import project.');
  await expect(page.getByRole('status')).toBeInViewport();
  await page.screenshot({ path: '/tmp/framekit-project-import-compact.png' });
  await createProject(page, 'Blank canvas');
  await expect(page.locator('[data-workbench-canvas]')).toBeVisible();
});

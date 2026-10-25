import { execFileSync } from 'node:child_process';

import { expect, test, type Page } from '@playwright/test';

import { chooseDropdown, createProject, expectWorker } from './workbench-helpers';

const errors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const current: string[] = [];
  errors.set(page, current);
  page.on('pageerror', (error) => current.push(error.message));
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/project-workbench/index.html');
  await createProject(page, 'Welcome card');
});

test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

const pick = async (page: Page, control: string, option: string): Promise<void> => {
  await page.getByRole('button', { name: control, exact: true }).click();
  await page
    .getByRole('dialog', { name: /Choose|Copy text|Preview device/ })
    .getByRole('button', { name: option, exact: true })
    .click();
};

test('creates a shared prefab, edits its own hierarchy, places another instance, and persists the whole project', async ({
  page,
}) => {
  await page.getByRole('treeitem', { name: 'Feature panel', exact: true }).click();
  await page.getByRole('button', { name: 'Prefabs tab', exact: true }).click();
  await page.getByRole('button', { name: '+ Create prefab', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Return to scene', exact: true })).toBeEnabled();
  await page.getByRole('treeitem', { name: 'Feature title', exact: true }).click();
  const text = page.getByRole('textbox', { name: 'Text', exact: true });
  await text.fill('A shared component.');
  await text.press('ControlOrMeta+Enter');
  await page.getByRole('button', { name: 'Return to scene', exact: true }).click();
  await expect(
    page
      .getByRole('region', { name: 'Design canvas' })
      .getByText('A shared component.', { exact: true }),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Prefabs tab', exact: true }).click();
  await page.getByRole('button', { name: 'Insert prefab Feature panel', exact: true }).click();
  await expect(
    page
      .getByRole('region', { name: 'Design canvas' })
      .getByText('A shared component.', { exact: true }),
  ).toHaveCount(2);
  await page.getByRole('button', { name: 'Edit prefab Feature panel', exact: true }).click();
  await page.getByRole('treeitem', { name: 'Feature title', exact: true }).click();
  await text.fill('Updated everywhere.');
  await text.press('ControlOrMeta+Enter');
  await page.getByRole('button', { name: 'Return to scene', exact: true }).click();
  await page.reload();
  await expect(
    page
      .getByRole('region', { name: 'Design canvas' })
      .getByText('Updated everywhere.', { exact: true }),
  ).toHaveCount(2);
  await page.getByRole('button', { name: 'Prefabs tab', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Edit prefab Primary button', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Edit prefab Feature panel', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: '/tmp/framekit-prefab-library.png' });
});

test('runs nested prefab events independently and downloads a working multi-file ZIP', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Back to projects', exact: true }).click();
  await createProject(page, 'Interactive counters');
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  const canvas = page.frameLocator('iframe[title="Presented project"]');
  const buttons = canvas.getByRole('button', { name: '+ Add one', exact: true });
  await buttons.nth(0).click();
  await buttons.nth(0).click();
  await expect(canvas.getByText('2', { exact: true })).toBeVisible();
  await expect(canvas.getByText('0', { exact: true })).toBeVisible();
  await buttons.nth(1).click();
  await expect(
    canvas.getByText('The right prefab emitted CountChanged.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Exit presentation', exact: true }).click();
  await expect(
    page.locator('[data-scene-id="left-counter/@/nested-counter/@/count"]'),
  ).toContainText('0');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page
    .getByRole('treeitem', { name: 'src/prefabs/create-counter-prefab.ts', exact: true })
    .click();
  await expectWorker(page.getByRole('region', { name: 'Generated TypeScript' })).toContainText(
    'outputChanged.emit()',
  );
  await expect(page.getByRole('region', { name: 'Generated TypeScript' })).toContainText(
    'Number(count.Text)',
  );
  await page.getByRole('treeitem', { name: 'index.html', exact: true }).click();
  const html = page.getByRole('region', { name: 'Generated html' });
  await expectWorker(html).toContainText('<!doctype html>');
  await expect(html).toContainText('/src/main.ts');
  const shown = await html.locator('pre').filter({ hasText: '<!doctype' }).textContent();
  await page.screenshot({ path: '/tmp/framekit-project-export.png' });
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download ZIP', exact: true }).click();
  const zip = await downloading;
  expect(zip.suggestedFilename()).toMatch(/\.zip$/);
  const path = (await zip.path())!;
  expect(execFileSync('unzip', ['-p', path, 'index.html'], { encoding: 'utf8' })).toBe(
    `${shown}\n`,
  );
  const files = execFileSync('unzip', ['-Z1', path], { encoding: 'utf8' });
  expect(files).toContain('framekit/src/index.ts');
  expect(files).toContain('src/prefabs/create-counter-panel-prefab.ts');
  expect(files).toContain('package.json');
});

test('declares a custom output and connects it to scene behavior through the event editor', async ({
  page,
}) => {
  await page.getByRole('treeitem', { name: 'Get started', exact: true }).click();
  await page.getByRole('button', { name: 'Edit prefab', exact: true }).click();
  await page.getByRole('button', { name: 'Events', exact: true }).click();
  await page.getByRole('textbox', { name: 'Custom event name', exact: true }).fill('Accepted');
  await page.getByRole('button', { name: '+ Add', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Remove event Accepted', exact: true }),
  ).toBeVisible();
  await chooseDropdown(page, 'Connection action', 'Emit custom event');
  await pick(page, 'Connection target', 'Accepted');
  await page.getByRole('button', { name: 'Save connection', exact: true }).click();
  await page.getByRole('button', { name: 'Close events', exact: true }).click();
  await page.getByRole('button', { name: 'Return to scene', exact: true }).click();
  await page.getByRole('button', { name: 'Events', exact: true }).click();
  await pick(page, 'Trigger event', 'Accepted');
  await pick(page, 'Connection target', 'Headline');
  await page
    .getByRole('textbox', { name: 'Connection value', exact: true })
    .fill('Accepted by prefab.');
  await page.getByRole('button', { name: 'Save connection', exact: true }).click();
  await page.screenshot({ path: '/tmp/framekit-events-editor.png' });
  await page.getByRole('button', { name: 'Close events', exact: true }).click();
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await page
    .frameLocator('iframe[title="Presented project"]')
    .getByRole('button', { name: 'Build something →', exact: true })
    .click();
  await expect(
    page
      .frameLocator('iframe[title="Presented project"]')
      .getByText('Accepted by prefab.', { exact: true }),
  ).toBeVisible();
});

test('supports free canvas dragging, optional snapping and guides, and non-destructive device previews', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });

  // This drag test's setup uses native keyboard activation, avoiding CI's scroll-into-view stall.
  for (const name of ['Canvas snapping', 'Alignment guides', 'Canvas grid']) {
    const toggle = settings.getByRole('button', { name, exact: true });
    await toggle.press('Space');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  }

  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await chooseDropdown(page, 'Canvas zoom', '100%');
  const headline = page.locator('[data-scene-id="headline"]');
  const original = await headline.elementHandle();
  const box = (await headline.boundingBox())!;
  await page.mouse.move(box.x + 100, box.y + 24);
  await page.mouse.down();
  await page.mouse.move(box.x + 123, box.y + 41, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole('textbox', { name: 'Position X offset', exact: true })).toHaveValue(
    '63',
  );
  await expect(page.getByRole('textbox', { name: 'Position Y offset', exact: true })).toHaveValue(
    '89',
  );
  expect(await headline.evaluate((element, previous) => element === previous, original)).toBe(true);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Position X offset', exact: true })).toHaveValue(
    '40',
  );
  await page.getByRole('button', { name: 'Settings', exact: true }).click();

  for (const name of ['Canvas snapping', 'Alignment guides']) {
    const toggle = settings.getByRole('button', { name, exact: true });
    await toggle.press('Space');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  }

  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  const start = (await headline.boundingBox())!;
  await page.mouse.move(start.x + 100, start.y + 24);
  await page.mouse.down();
  await page.mouse.move(start.x + 103, start.y + 44, { steps: 8 });
  await expect(page.locator('[data-canvas-guide]:visible').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.getByRole('textbox', { name: 'Position Y offset', exact: true })).toHaveValue(
    '72',
  );
  await chooseDropdown(page, 'Canvas zoom', 'Fit canvas');
  await chooseDropdown(page, 'Canvas resolution', /Phone · 390 × 844 px · Portrait/);
  const canvas = page.locator('[data-workbench-canvas]');
  await expect(canvas).toHaveCSS('width', '390px');
  await expect(canvas).toHaveCSS('height', '844px');
  await chooseDropdown(page, 'Canvas orientation', 'Landscape');
  await expect(canvas).toHaveCSS('width', '844px');
  await expect(canvas).toHaveCSS('height', '390px');
  await page.getByRole('button', { name: 'Canvas settings', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'width', exact: true })).toHaveValue('960');
  await expect(page.getByRole('textbox', { name: 'height', exact: true })).toHaveValue('640');
  await page.screenshot({ path: '/tmp/framekit-device-preview.png' });
  await page.reload();
  await expect(canvas).toHaveCSS('width', '844px');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Canvas grid', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.getByRole('button', { name: 'Canvas snapping', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.screenshot({ path: '/tmp/framekit-settings.png' });
});

test('keeps custom device settings, event forms, and export files usable on compact screens', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const width = page.getByRole('textbox', { name: 'Custom preview width', exact: true });
  await width.fill('800');
  await width.press('Enter');
  const height = page.getByRole('textbox', { name: 'Custom preview height', exact: true });
  await height.fill('600');
  await height.press('Enter');
  await width.fill('1');
  await width.press('Tab');
  await expect(width).toHaveAttribute('aria-invalid', 'true');
  await width.press('Escape');
  await expect(width).toHaveValue('800');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  const canvas = page.locator('[data-workbench-canvas]');
  await expect(canvas).toHaveCSS('width', '800px');
  await expect(canvas).toHaveCSS('height', '600px');
  await page.getByRole('button', { name: 'Events', exact: true }).click();
  const save = page.getByRole('button', { name: 'Save connection', exact: true });
  await save.scrollIntoViewIfNeeded();
  const left = (await save.boundingBox())!;
  const right = (await page
    .getByRole('button', { name: 'Delete connection', exact: true })
    .boundingBox())!;
  expect(left.x + left.width).toBeLessThan(right.x);
  expect(right.x + right.width).toBeLessThanOrEqual(375);
  await page.getByRole('button', { name: 'Close events', exact: true }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await expectWorker(page.getByRole('region', { name: 'Generated TypeScript' })).toContainText(
    'createScene',
  );
  await page.getByRole('button', { name: 'Browse project files', exact: true }).click();
  await page.getByRole('treeitem', { name: 'index.html', exact: true }).click();
  await expectWorker(page.getByRole('region', { name: 'Generated html' })).toContainText(
    '/src/main.ts',
  );
  await page.getByRole('button', { name: 'Close export', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Appearance', exact: true }).click();
  await chooseDropdown(page, 'Code theme', 'GitHub Light');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('button', { name: 'Browse project files', exact: true }).click();
  await page.getByRole('treeitem', { name: 'index.html', exact: true }).click();
  await expectWorker(page.getByRole('region', { name: 'Generated html' })).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await page.screenshot({ path: '/tmp/framekit-export-mobile.png' });
  await page.getByRole('button', { name: 'Close export', exact: true }).click();
  await page.reload();
  await expect(canvas).toHaveCSS('width', '800px');
  await expect(canvas).toHaveCSS('height', '600px');
});

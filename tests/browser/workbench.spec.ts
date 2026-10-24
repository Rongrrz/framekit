import { readFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import { createProject } from './workbench-helpers';

const runtimeErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/project-workbench/index.html');
  await createProject(page, 'Welcome card');
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([]);
});

test('edits persistent scene objects, picks from the canvas, and supports undo and redo', async ({
  page,
}) => {
  const headline = page.locator('[data-scene-id="headline"]');
  await expect(headline).toContainText('Make something persistent.');
  const original = await headline.elementHandle();
  await headline.click();
  await expect(page.getByRole('treeitem', { name: 'Headline', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const text = page.getByRole('textbox', { name: 'Text', exact: true });
  await text.fill('A working editor.');
  await text.press('ControlOrMeta+Enter');
  await expect(headline).toContainText('A working editor.');
  const canvas = await page.locator('[data-workbench-canvas]').boundingBox();
  const card = await page.locator('[data-scene-id="card"]').boundingBox();
  expect(card!.x).toBeGreaterThan(canvas!.x);
  expect(card!.x + card!.width).toBeLessThan(canvas!.x + canvas!.width);
  expect(await headline.evaluate((element, previous) => element === previous, original)).toBe(true);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(headline).toContainText('Make something persistent.');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(headline).toContainText('A working editor.');
  await page.screenshot({ path: '/tmp/framekit-workbench-desktop.png' });
});

test('applies dimensions, colors, rotation, and visibility through property controls', async ({
  page,
}) => {
  const card = page.locator('[data-scene-id="card"]');
  for (const [name, value] of [
    ['Size X offset', '720'],
    ['Size Y offset', '480'],
    ['BackgroundColor3', '#112233'],
    ['Rotation', '12'],
  ] as const) {
    const field = page.getByRole('textbox', { name, exact: true });
    await field.fill(value);
    await field.press('Enter');
  }

  await expect(card).toHaveCSS('width', '720px');
  await expect(card).toHaveCSS('height', '480px');
  await expect(card).toHaveCSS('background-color', 'rgb(17, 34, 51)');
  await expect(card).toHaveCSS('rotate', '12deg');
  const visible = page.getByRole('button', { name: 'Visible', exact: true });
  await visible.click();
  await expect(card).toBeHidden();
  await visible.click();
  await expect(card).toBeVisible();
  await page.getByRole('button', { name: 'Canvas settings', exact: true }).click();
  await page.getByRole('textbox', { name: 'width', exact: true }).fill('1200');
  await page.getByRole('textbox', { name: 'width', exact: true }).press('Enter');
  await expect(page.locator('[data-workbench-canvas]')).toHaveCSS('width', '1200px');
});

test('inserts, renames, reparents, duplicates, and deletes through the editor', async ({
  page,
}) => {
  await page.getByRole('button', { name: '+ Insert', exact: true }).click();
  await page.getByRole('button', { name: 'Add Frame', exact: true }).click();
  const name = page.getByRole('textbox', { name: 'Name', exact: true });
  await name.fill('New panel');
  await name.press('Enter');
  await expect(page.getByRole('treeitem', { name: 'New panel', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: 'Explorer actions', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Move to…', exact: true }).click();
  await page.getByRole('button', { name: 'Canvas (top level)', exact: true }).click();
  await expect(page.getByRole('treeitem', { name: 'New panel', exact: true })).toHaveAttribute(
    'aria-level',
    '1',
  );
  await page.getByRole('button', { name: 'Explorer actions', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Duplicate', exact: true }).click();
  await expect(page.getByRole('treeitem', { name: 'New panel copy', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: 'Explorer actions', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('treeitem', { name: 'New panel copy', exact: true })).toHaveCount(0);
  await page.getByRole('treeitem', { name: 'Headline', exact: true }).click();
  await page.getByRole('button', { name: 'Explorer actions', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Move to…', exact: true }).click();
  await page.getByRole('button', { name: 'Canvas (top level)', exact: true }).click();
  await expect(page.getByRole('treeitem', { name: 'Headline', exact: true })).toHaveAttribute(
    'aria-level',
    '1',
  );
});

test('resizes panels, restores the project and layout, and exports only source code', async ({
  page,
}) => {
  const splitter = page.getByRole('separator', { name: 'Explorer width' });
  await splitter.focus();
  await splitter.press('ArrowRight');
  await expect(splitter).toHaveAttribute('aria-valuenow', '250');
  await page.getByRole('treeitem', { name: 'Headline', exact: true }).click();
  const text = page.getByRole('textbox', { name: 'Text', exact: true });
  await text.fill('Saved between visits');
  await text.press('ControlOrMeta+Enter');
  await page.reload();
  await expect(page.locator('[data-scene-id="headline"]')).toContainText('Saved between visits');
  await expect(splitter).toHaveAttribute('aria-valuenow', '250');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Generated TypeScript' })).toContainText(
    /Saved between visits/,
  );
  const sourceDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .ts' }).click();
  expect((await sourceDownload).suggestedFilename()).toMatch(/\.ts$/);
  await page.getByRole('button', { name: 'Close export' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved in this browser');
  await expect(page.getByRole('button', { name: /JSON/ })).toHaveCount(0);
});

test('keeps the three panels and file commands reachable on compact screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('separator', { name: 'Explorer width' })).toBeHidden();
  await expect(page.locator('[data-scene-id="headline"]')).toBeVisible();
  const bounds = await page.locator('[data-scene-id="headline"]').boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Explorer', exact: true }).click();
  await page.getByRole('treeitem', { name: 'Headline', exact: true }).click();
  await page.getByRole('button', { name: 'Properties', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Headline');
  await page.getByRole('button', { name: 'Canvas', exact: true }).click();
  await expect(page.locator('[data-scene-id="headline"]')).toBeVisible();
  await page.screenshot({ path: '/tmp/framekit-workbench-mobile.png' });
  await page.getByRole('button', { name: '+ Insert', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search commands' }).fill('TextLabel');
  await page.getByRole('textbox', { name: 'Search commands' }).press('Enter');
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('TextLabel');
});

test('shows formatted highlighted code in persistent themes and downloads the displayed source', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const region = page.getByRole('region', { name: 'Generated TypeScript' });
  const source = region.locator('pre').filter({ hasText: "from 'framekit'" });
  await expect(source).toContainText('const welcomeCard = createFrame({');
  const tokenColors = await source
    .locator('span[style*="color"]')
    .evaluateAll((nodes) => new Set(nodes.map((node) => (node as HTMLElement).style.color)).size);
  expect(tokenColors).toBeGreaterThan(3);
  await page.screenshot({ path: '/tmp/framekit-workbench-code-dark.png' });
  const original = await source.textContent();
  const dark = await region.evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.getByRole('button', { name: 'Close export', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Code theme GitHub Light', exact: true }).click();
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(region).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  expect(await source.textContent()).toBe(original);
  expect(await region.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(
    dark,
  );
  await expect(page.getByRole('button', { name: 'GitHub Light', exact: true })).toHaveCount(0);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .ts', exact: true }).click();
  const path = await (await downloading).path();
  expect(await readFile(path!, 'utf8')).toBe(`${original}\n`);
  await page.reload();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(region).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.getByRole('button', { name: 'Close export', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(region).toContainText('welcomeCard');
  await page.screenshot({ path: '/tmp/framekit-workbench-code-mobile.png' });
});

test('keeps invalid editing buffers without saving incomplete values', async ({ page }) => {
  const headline = page.locator('[data-scene-id="headline"]');
  await headline.click();
  const rotation = page.getByRole('textbox', { name: 'Rotation', exact: true });
  await rotation.fill('-');
  await rotation.press('Enter');
  await expect(rotation).toHaveAttribute('aria-invalid', 'true');
  await expect(headline).toHaveCSS('rotate', '0deg');
  await rotation.press('Escape');
  await expect(rotation).toHaveValue('0');
});

test('edits multiline content and selects property values from dropdown menus', async ({
  page,
}) => {
  await page.getByRole('treeitem', { name: 'Feature copy', exact: true }).click();
  const text = page.getByRole('textbox', { name: 'Text', exact: true });
  const original = await text.inputValue();
  expect(original).toContain('\n');
  await text.fill('Line one\nLine two');
  await text.press('Escape');
  await expect(text).toHaveValue(original);
  await text.fill('Line one\nLine two');
  await text.press('ControlOrMeta+Enter');
  await expect(page.locator('[data-scene-id="feature-copy"]')).toContainText('Line one\nLine two');
  await page.getByRole('button', { name: 'TextXAlignment', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Center', exact: true }).click();
  await expect(page.getByRole('button', { name: 'TextXAlignment', exact: true })).toContainText(
    'Center',
  );
});

test('keeps tree ancestors during search and reveals canvas selections in collapsed branches', async ({
  page,
}) => {
  const card = page.getByRole('treeitem', { name: 'Welcome card', exact: true });
  await card.click({ position: { x: 12, y: 17 } });
  await expect(page.getByRole('treeitem', { name: 'Headline', exact: true })).toHaveCount(0);
  await page.locator('[data-scene-id="headline"]').click();
  await expect(page.getByRole('treeitem', { name: 'Headline', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('textbox', { name: 'Search hierarchy' }).fill('Feature copy');
  await expect(page.getByRole('treeitem', { name: 'Welcome card', exact: true })).toHaveAttribute(
    'aria-level',
    '1',
  );
  await expect(page.getByRole('treeitem', { name: 'Feature panel', exact: true })).toHaveAttribute(
    'aria-level',
    '2',
  );
  await expect(page.getByRole('treeitem', { name: 'Feature copy', exact: true })).toHaveAttribute(
    'aria-level',
    '3',
  );
});

test('supports pointer splitting and resets transient input state when returning to design', async ({
  page,
}) => {
  const splitter = page.getByRole('separator', { name: 'Properties width' });
  const box = await splitter.boundingBox();
  await page.mouse.move(box!.x + 2, box!.y + 100);
  await page.mouse.down();
  await page.mouse.move(box!.x - 38, box!.y + 100);
  await page.mouse.up();
  await expect(splitter).toHaveAttribute('aria-valuenow', '360');
  await page.getByRole('button', { name: '+ Insert', exact: true }).click();
  await page.getByRole('button', { name: 'Add TextInput', exact: true }).click();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const previewInput = page.locator('[data-workbench-canvas] input');
  await previewInput.fill('Transient typing');
  await expect(previewInput).toHaveValue('Transient typing');
  await page.getByRole('button', { name: 'Design', exact: true }).click();
  await expect(previewInput).toHaveValue('');
});

test('releases its GUI, modal, and owned observers when destroyed', async ({ page }) => {
  await page.goto('/tests/browser/index.html');
  const result = await page.evaluate(async () => {
    const path = '/project-workbench/src/app.ts';
    const { createWorkbench } = await import(/* @vite-ignore */ path);
    const app = createWorkbench();
    app.mount('#root');
    const root = app.unsafeElement;
    const observer = new MutationObserver(() => undefined);
    observer.observe(document.body, { childList: true, subtree: true });
    const code = [...root.querySelectorAll('button')].find((node) => node.textContent === 'Code')!;
    code.click();
    const opened = document.querySelectorAll('dialog[open]').length;
    app.destroy();
    const recordsAfterDestruction = observer.takeRecords().length;
    window.dispatchEvent(new Event('resize'));
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const laterMutations = observer.takeRecords().length;
    observer.disconnect();
    return {
      opened,
      connected: root.isConnected,
      children: document.querySelector('#root')!.childElementCount,
      openDialogs: document.querySelectorAll('dialog[open]').length,
      recordsAfterDestruction,
      laterMutations,
    };
  });
  expect(result.opened).toBe(1);
  expect(result.connected).toBe(false);
  expect(result.children).toBe(0);
  expect(result.openDialogs).toBe(0);
  expect(result.recordsAfterDestruction).toBeGreaterThan(0);
  expect(result.laterMutations).toBe(0);
});

test('creates projects from templates, manages the library, and keeps project histories separate', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Back to projects', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Projects home' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Welcome card', exact: true })).toHaveCount(
    0,
  );
  await expect(page.locator('[data-project-card]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open First canvas', exact: true })).toBeVisible();
  await page.screenshot({ path: '/tmp/framekit-projects-home.png' });
  await createProject(page, 'Dashboard');
  await expect(page.getByRole('treeitem', { name: 'Navigation', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Back to projects', exact: true }).click();
  await expect(page.locator('[data-project-row]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Options for Dashboard', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Rename project', exact: true }).click();
  const name = page.getByRole('textbox', { name: 'Project name', exact: true });
  await expect(name).toBeFocused();
  await name.fill('Mission control');
  await name.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Open Mission control', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Options for Mission control', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Duplicate project', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Open Mission control copy', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Options for Mission control copy', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Delete project', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Open Mission control copy', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Options for Mission control copy', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Delete project', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Delete project?' })
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Open Mission control copy', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Search projects', exact: true }).fill('first');
  await expect(page.getByRole('button', { name: 'Open Mission control', exact: true })).toHaveCount(
    0,
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open First canvas', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open First canvas', exact: true }).click();
  await expect(page.locator('[data-scene-id="headline"]')).toContainText(
    'Make something persistent.',
  );
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await page.goBack();
  await expect(page.getByRole('region', { name: 'Projects home' })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('treeitem', { name: 'Headline', exact: true })).toBeVisible();
});

test('starts on an empty project home and offers templates on a compact screen', async ({
  page,
}) => {
  await page.evaluate(() => localStorage.clear());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/project-workbench/index.html');
  await expect(page.getByRole('region', { name: 'Projects home' })).toBeVisible();
  await expect(page.getByText('Your projects will live here.', { exact: false })).toBeVisible();
  await createProject(page, 'Settings panel');
  await expect(page.locator('[data-scene-id="settings"]')).toBeVisible();
  await page.getByRole('button', { name: 'Back to projects', exact: true }).click();
  await createProject(page, 'Blank canvas');
  await expect(page.locator('[data-scene-id]')).toHaveCount(0);
  await page.getByRole('button', { name: '+ Insert', exact: true }).click();
  await page.getByRole('button', { name: 'Add Frame', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Frame');
});

const dragLayer = async (
  page: Page,
  source: string,
  target: string,
  placement: 'inside' | 'before' | 'after' = 'inside',
): Promise<void> => {
  const from = page.getByRole('treeitem', { name: source, exact: true });
  const to =
    target === 'Canvas root'
      ? page.getByRole('button', { name: target, exact: true })
      : page.getByRole('treeitem', { name: target, exact: true });
  await from.scrollIntoViewIfNeeded();
  const start = (await from.boundingBox())!;
  await to.scrollIntoViewIfNeeded();
  const end = (await to.boundingBox())!;
  await page.mouse.move(start.x + 100, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    end.x + 100,
    end.y + (placement === 'before' ? 3 : placement === 'after' ? end.height - 3 : end.height / 2),
    { steps: 12 },
  );
  await page.mouse.up();
};

test('drags branches into parents, between siblings, and onto the canvas with undo and stable objects', async ({
  page,
}) => {
  const headline = page.locator('[data-scene-id="headline"]');
  const original = await headline.elementHandle();
  await dragLayer(page, 'Headline', 'Feature panel');
  await expect(page.getByRole('treeitem', { name: 'Headline', exact: true })).toHaveAttribute(
    'aria-level',
    '3',
  );
  expect(await headline.evaluate((element, previous) => element === previous, original)).toBe(true);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('treeitem', { name: 'Headline', exact: true })).toHaveAttribute(
    'aria-level',
    '2',
  );
  await dragLayer(page, 'Feature panel', 'Headline', 'before');
  const order = await page.getByRole('treeitem').allTextContents();
  expect(order.findIndex((text) => text.includes('Feature panel'))).toBeLessThan(
    order.findIndex((text) => text.includes('Headline')),
  );
  await dragLayer(page, 'Feature panel', 'Canvas root');
  await expect(page.getByRole('treeitem', { name: 'Feature panel', exact: true })).toHaveAttribute(
    'aria-level',
    '1',
  );
  await expect(page.getByRole('treeitem', { name: 'Feature title', exact: true })).toHaveAttribute(
    'aria-level',
    '2',
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('treeitem', { name: 'Feature panel', exact: true })).toHaveAttribute(
    'aria-level',
    '2',
  );
  await dragLayer(page, 'Welcome card', 'Feature panel');
  await expect(page.getByRole('treeitem', { name: 'Welcome card', exact: true })).toHaveAttribute(
    'aria-level',
    '1',
  );
});

test('renames with F2, reorders with the keyboard, and exposes context actions', async ({
  page,
}) => {
  const headline = page.getByRole('treeitem', { name: 'Headline', exact: true });
  await headline.click();
  await headline.press('F2');
  const rename = page.getByRole('textbox', { name: 'Rename object', exact: true });
  await expect(rename).toBeFocused();
  await rename.fill('Main heading');
  await rename.press('Enter');
  const renamed = page.getByRole('treeitem', { name: 'Main heading', exact: true });
  await expect(renamed).toHaveAttribute('aria-selected', 'true');
  await renamed.press('Alt+ArrowUp');
  const order = await page.getByRole('treeitem').allTextContents();
  expect(order.findIndex((text) => text.includes('Main heading'))).toBeLessThan(
    order.findIndex((text) => text.includes('Eyebrow')),
  );
  await renamed.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Rename', exact: true }).click();
  await expect(rename).toBeFocused();
  await rename.fill('Discard this');
  await rename.press('Escape');
  await expect(renamed).toBeVisible();
  await renamed.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Show / hide', exact: true }).click();
  await expect(page.locator('[data-scene-id="headline"]')).toBeHidden();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('[data-scene-id="headline"]')).toBeVisible();
});

test('opens hierarchy context menus after release and supports outside dismissal and keyboard access', async ({
  page,
}) => {
  const row = page.getByRole('treeitem', { name: 'Feature panel', exact: true });
  const menu = page.getByRole('menu');
  const bounds = (await row.boundingBox())!;

  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down({ button: 'right' });
  await expect(menu).toBeHidden();
  await page.mouse.up({ button: 'right' });
  await expect(menu).toBeVisible();
  await expect(row).toHaveAttribute('aria-selected', 'true');
  await expect(menu.getByRole('menuitem', { name: 'Rename', exact: true })).toBeFocused();

  const name = page.getByRole('textbox', { name: 'Name', exact: true });
  await name.click();
  await expect(menu).toBeHidden();
  await expect(name).toBeFocused();

  await row.press('Shift+F10');
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();

  await row.click();
  await expect(menu).toBeHidden();
});

test('copies and cuts branches with shortcuts while keeping property text editing native', async ({
  page,
}) => {
  const feature = page.getByRole('treeitem', { name: 'Feature panel', exact: true });
  await feature.click();
  await feature.press('ControlOrMeta+c');
  await page.getByRole('button', { name: 'Canvas root', exact: true }).click();
  await page.getByRole('button', { name: 'Canvas root', exact: true }).press('ControlOrMeta+v');
  const copy = page.getByRole('treeitem', { name: 'Feature panel copy', exact: true });
  await expect(copy).toHaveAttribute('aria-level', '1');
  await expect(copy).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(copy).toHaveCount(0);
  const headline = page.getByRole('treeitem', { name: 'Headline', exact: true });
  await headline.click();
  await headline.press('ControlOrMeta+x');
  await feature.click();
  await feature.press('ControlOrMeta+v');
  await expect(headline).toHaveAttribute('aria-level', '3');
  await headline.click();
  const text = page.getByRole('textbox', { name: 'Text', exact: true });
  await text.fill('Keep this editing buffer');
  await text.press('ControlOrMeta+a');
  await text.press('ControlOrMeta+x');
  await expect(text).toHaveValue('');
  await expect(headline).toBeVisible();
});

test('expands hovered branches during a drag and cancels with Escape', async ({ page }) => {
  const feature = page.getByRole('treeitem', { name: 'Feature panel', exact: true });
  await feature.click({ position: { x: 26, y: 17 } });
  await expect(page.getByRole('treeitem', { name: 'Feature title', exact: true })).toHaveCount(0);
  const headline = page.getByRole('treeitem', { name: 'Headline', exact: true });
  const start = (await headline.boundingBox())!;
  const end = (await feature.boundingBox())!;
  await page.mouse.move(start.x + 100, start.y + 17);
  await page.mouse.down();
  await page.mouse.move(end.x + 100, end.y + 17, { steps: 10 });
  await expect(feature).toHaveAttribute('data-drop-inside', '');
  await expect(page.getByRole('treeitem', { name: 'Feature title', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(headline).toHaveAttribute('aria-level', '2');
  await expect(page.locator('[data-drop-inside]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
});

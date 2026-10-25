import { expect, test, type Locator, type Page } from '@playwright/test';

import { chooseDropdown, createProject } from './workbench-helpers';

const bounds = async (
  node: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> => (await node.boundingBox())!;

const savedProject = async (page: Page): Promise<string | null> =>
  page.evaluate(() => localStorage.getItem('framekit-workbench-projects-v1'));

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/project-workbench/');
  await createProject(page, 'Welcome card');
  await expect(page.locator('[data-workbench-canvas]')).toBeInViewport();
});

test('keeps the viewed point centered when zoom presets change and Fit recenters the artboard', async ({
  page,
}) => {
  const canvas = page.locator('[data-workbench-canvas]');
  const viewport = page.getByRole('region', { name: 'Design canvas', exact: true });
  await chooseDropdown(page, 'Canvas zoom', '100%');
  const stage = await bounds(viewport);
  await viewport.evaluate((element) => {
    element.scrollLeft += 100;
    element.scrollTop += 70;
  });
  const before = await bounds(canvas);
  const center = { x: stage.x + stage.width / 2, y: stage.y + stage.height / 2 };
  await chooseDropdown(page, 'Canvas zoom', '200%');
  const after = await bounds(canvas);
  expect(
    Math.abs(after.x + ((center.x - before.x) * after.width) / before.width - center.x),
  ).toBeLessThan(1.5);
  expect(
    Math.abs(after.y + ((center.y - before.y) * after.height) / before.height - center.y),
  ).toBeLessThan(1.5);
  await chooseDropdown(page, 'Canvas zoom', 'Fit canvas');
  const fitted = await bounds(canvas);
  expect(Math.abs(fitted.x + fitted.width / 2 - center.x)).toBeLessThan(1.5);
  expect(Math.abs(fitted.y + fitted.height / 2 - center.y)).toBeLessThan(1.5);
});

test('pans with Space, middle mouse and the Hand tool without selecting or changing objects', async ({
  page,
}) => {
  const viewport = page.getByRole('region', { name: 'Design canvas', exact: true });
  const canvas = page.locator('[data-workbench-canvas]');
  const headline = page.locator('[data-scene-id="headline"]');
  const selected = page.getByRole('treeitem', { name: 'Welcome card', exact: true });
  const original = await savedProject(page);
  await viewport.focus();
  await page.keyboard.down('Space');
  await expect(viewport).toHaveCSS('cursor', 'grab');
  const start = await bounds(canvas);
  const target = await bounds(headline);
  await page.mouse.move(target.x + 50, target.y + 20);
  await page.mouse.down();
  await page.mouse.move(target.x + 130, target.y + 70, { steps: 4 });
  await page.keyboard.up('Space');
  await expect(viewport).toHaveCSS('cursor', 'grabbing');
  await page.mouse.up();
  await expect.poll(async () => (await bounds(canvas)).x - start.x).toBeCloseTo(80, 0);
  await expect.poll(async () => (await bounds(canvas)).y - start.y).toBeCloseTo(50, 0);
  await expect(selected).toHaveAttribute('aria-selected', 'true');

  const middle = await bounds(canvas);
  await page.mouse.move(target.x + 60, target.y + 30);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(target.x, target.y + 10, { steps: 4 });
  await page.mouse.up({ button: 'middle' });
  await expect.poll(async () => (await bounds(canvas)).x - middle.x).toBeCloseTo(-60, 0);
  await expect.poll(async () => (await bounds(canvas)).y - middle.y).toBeCloseTo(-20, 0);

  await page.getByRole('button', { name: 'Hand tool', exact: true }).click();
  const handStart = await bounds(canvas);
  const handTarget = await bounds(headline);
  await page.mouse.move(handTarget.x + 50, handTarget.y + 15);
  await page.mouse.down();
  await page.mouse.move(handTarget.x + 20, handTarget.y - 15, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => (await bounds(canvas)).x - handStart.x).toBeCloseTo(-30, 0);
  await expect(page.getByRole('button', { name: 'Hand tool', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(selected).toHaveAttribute('aria-selected', 'true');
  expect(await savedProject(page)).toBe(original);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();

  await page.keyboard.press('v');
  await chooseDropdown(page, 'Canvas zoom', 'Fit canvas');
  await expect.poll(async () => (await bounds(canvas)).x).toBeCloseTo(start.x, 0);
  await expect.poll(async () => (await bounds(canvas)).y).toBeCloseTo(start.y, 0);
  await headline.click();
  await expect(page.getByRole('treeitem', { name: 'Headline', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.screenshot({ path: '/tmp/framekit-canvas-navigation.png' });
});

test('zooms about the pointer, labels arbitrary zoom levels and restores up to 400 percent', async ({
  page,
}) => {
  const canvas = page.locator('[data-workbench-canvas]');
  const viewport = page.getByRole('region', { name: 'Design canvas', exact: true });
  const original = await savedProject(page);
  await chooseDropdown(page, 'Canvas zoom', '100%');
  const before = await bounds(canvas);
  const point = { x: before.x + 240, y: before.y + 180 };
  await page.mouse.move(point.x, point.y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -150);
  await page.keyboard.up('Control');
  await expect.poll(async () => (await bounds(canvas)).width).toBeGreaterThan(before.width);
  const after = await bounds(canvas);
  expect(
    Math.abs(after.x + ((point.x - before.x) * after.width) / before.width - point.x),
  ).toBeLessThan(1.5);
  expect(
    Math.abs(after.y + ((point.y - before.y) * after.height) / before.height - point.y),
  ).toBeLessThan(1.5);
  await expect(page.getByRole('button', { name: 'Canvas zoom', exact: true })).toHaveText(
    `${Math.round((after.width / 960) * 100)}%`,
  );
  await chooseDropdown(page, 'Canvas zoom', '400%');
  await expect.poll(async () => (await bounds(canvas)).width).toBe(3840);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Canvas zoom', exact: true })).toHaveText('400%');
  await expect.poll(async () => (await bounds(canvas)).width).toBe(3840);
  await viewport.focus();
  await page.keyboard.press('ControlOrMeta+-');
  await expect.poll(async () => (await bounds(canvas)).width).toBeLessThan(3840);
  await page.keyboard.press('ControlOrMeta+0');
  await expect(page.getByRole('button', { name: 'Canvas zoom', exact: true })).toHaveText(
    'Fit canvas',
  );
  await expect.poll(async () => (await bounds(canvas)).width).toBeLessThan(960);
  expect(await savedProject(page)).toBe(original);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
});

test('pans with wheel scrolling, cancels drags and preserves native text input', async ({
  page,
}) => {
  const viewport = page.getByRole('region', { name: 'Design canvas', exact: true });
  const canvas = page.locator('[data-workbench-canvas]');
  const start = await bounds(canvas);
  await page.mouse.move(start.x + 150, start.y + 150);
  await page.mouse.wheel(60, 80);
  await expect.poll(async () => (await bounds(canvas)).x - start.x).toBeCloseTo(-60, 0);
  await expect.poll(async () => (await bounds(canvas)).y - start.y).toBeCloseTo(-80, 0);
  await viewport.focus();
  await page.keyboard.press('h');
  const beforeDrag = await bounds(canvas);
  await page.mouse.down();
  await page.mouse.move(start.x + 210, start.y + 200);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect.poll(async () => (await bounds(canvas)).x).toBeCloseTo(beforeDrag.x, 0);
  await expect(page.getByRole('button', { name: 'Select tool', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.down('Space');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.keyboard.up('Space');
  await expect(viewport).not.toHaveAttribute('data-workbench-pan-ready');
  await expect(viewport).not.toHaveAttribute('data-workbench-panning');

  await page.getByRole('treeitem', { name: 'Headline', exact: true }).click();
  const name = page.getByRole('textbox', { name: 'Name', exact: true });
  await name.fill('A');
  await name.press('Space');
  await name.press('h');
  await expect(name).toHaveValue('A h');
  await expect(page.getByRole('button', { name: 'Select tool', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await name.press('Escape');
  await viewport.focus();
  await page.keyboard.down('Space');
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await expect(page.locator('iframe[title="Presented project"]')).toBeVisible();
  await page.getByRole('button', { name: 'Exit presentation', exact: true }).click();
  await expect(viewport).not.toHaveAttribute('data-workbench-pan-ready');
  await page.keyboard.up('Space');
});

test('destroys an editor during an active captured pan without leaving input handlers behind', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/tests/browser/index.html');
  await page.evaluate(async () => {
    const path = '/project-workbench/src/app.ts';
    const { createWorkbench } = await import(/* @vite-ignore */ path);
    const app = createWorkbench();
    app.mount('#root');
    const destroy = document.createElement('button');
    destroy.id = 'destroy-test-editor';
    destroy.addEventListener('click', () => app.destroy());
    document.body.append(destroy);
  });
  await createProject(page, 'Welcome card');
  const canvas = page.locator('[data-workbench-canvas]');
  await expect(canvas).toBeInViewport();
  const box = await bounds(canvas);
  await page.mouse.move(box.x + 120, box.y + 120);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(box.x + 160, box.y + 140);
  await expect(page.getByRole('region', { name: 'Design canvas', exact: true })).toHaveAttribute(
    'data-workbench-panning',
  );
  await page.evaluate(() => document.getElementById('destroy-test-editor')!.click());
  await page.mouse.up({ button: 'middle' });
  await page.keyboard.press('Space');
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await expect(page.locator('#root')).toBeEmpty();
  expect(errors).toEqual([]);
});

import { expect, test, type Page } from '@playwright/test';

import type {} from './harness.js';

const inspectorFor = (page: Page) =>
  page.getByRole('complementary', { name: 'FrameKit runtime inspector' });

test('opens and closes the inspector without changing the host URL or history', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/playground/index.html?preview=desktop#/guide');
  await expect(inspectorFor(page)).toHaveCount(0);

  const originalUrl = page.url();
  const historyLength = await page.evaluate(() => window.history.length);
  const originalRoot = await page.locator('#root > [data-framekit="ScreenGui"]').elementHandle();
  await page.getByRole('button', { name: /Switch to (light|dark) mode/ }).click();

  const theme = await page.locator('html').getAttribute('data-framekit-theme');
  await page.getByRole('button', { name: 'Debug', exact: true }).click();
  await expect(page).toHaveURL(originalUrl);

  const inspector = inspectorFor(page);
  await expect(inspector).toBeVisible();
  await expect(
    inspector.getByRole('searchbox', { name: 'Search runtime hierarchy' }),
  ).toBeFocused();
  await inspector.getByRole('button', { name: 'Close runtime inspector' }).click();
  await expect(inspector).toHaveCount(0);
  expect(await originalRoot!.evaluate((node) => node.isConnected)).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-framekit-theme', theme!);
  await expect(page.getByRole('button', { name: 'Debug', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Debug', exact: true }).click();
  await expect(inspector).toBeVisible();
  await page.getByRole('button', { name: 'Close runtime inspector' }).click();
  await expect(page).toHaveURL(originalUrl);
  expect(await page.evaluate(() => window.history.length)).toBe(historyLength);
  await expect(inspector).toHaveCount(0);
  await page.keyboard.press('F8');
  await expect(inspector).toBeVisible();
  await page.keyboard.press('F8');
  await expect(inspector).toHaveCount(0);
  await expect(page).toHaveURL(originalUrl);
  expect(errors).toEqual([]);
});

test('searches collapsed paths, navigates ancestors and selection history, and filters readable properties', async ({
  page,
}, info) => {
  await page.goto('/playground/index.html');
  await page.getByRole('button', { name: 'Debug', exact: true }).click();

  const inspector = inspectorFor(page);
  const search = inspector.getByRole('searchbox', { name: 'Search runtime hierarchy' });
  const tree = inspector.getByRole('tree', { name: 'Runtime hierarchy' });
  await search.fill('GetStartedButton');

  const row = tree.getByRole('treeitem', { name: 'GetStartedButton (TextButton)', exact: true });
  await expect(row).toBeVisible();
  await row.focus();
  await page.keyboard.press('Enter');
  await expect(inspector).toContainText('Class: TextButton');
  await expect(search).toHaveValue('GetStartedButton');

  const properties = inspector.getByRole('searchbox', { name: 'Filter runtime properties' });
  await properties.fill('BackgroundColor3');
  await expect(
    inspector.getByRole('group', { name: /^BackgroundColor3: #[A-F0-9]{6}$/ }),
  ).toBeVisible();
  await properties.fill('no such property');
  await expect(inspector.getByText('No matching properties', { exact: true })).toBeVisible();
  await properties.fill('');

  const parent = inspector
    .getByRole('navigation', { name: 'Instance ancestors' })
    .getByRole('button')
    .last();

  await parent.click();
  await expect(inspector).toContainText('Class: Frame');
  await inspector.getByRole('button', { name: 'Previous inspected instance' }).click();
  await expect(inspector).toContainText('Class: TextButton');
  await inspector.getByRole('button', { name: 'Next inspected instance' }).click();
  await expect(inspector).toContainText('Class: Frame');
  await search.fill('');
  await inspector.getByRole('button', { name: 'Collapse all nodes' }).click();
  await expect(tree.getByRole('treeitem')).toHaveCount(1);
  await search.fill('GetStartedButton');
  await expect(row).toBeVisible();
  await row.click();
  await search.fill('');
  await page.screenshot({ path: info.outputPath('inspector-desktop.png') });
});

test('picks elements without activating app commands and releases picking when closed', async ({
  page,
}) => {
  await page.goto('/playground/index.html');
  await page.getByRole('button', { name: 'Debug', exact: true }).click();

  const inspector = inspectorFor(page);
  await inspector.getByRole('separator', { name: 'Resize runtime inspector' }).focus();
  await page.keyboard.press('Home');
  await expect(inspector.getByRole('tab', { name: 'Hierarchy', exact: true })).toBeVisible();

  const pick = inspector.getByRole('button', { name: 'Pick an element' });
  await pick.click();
  await expect(pick).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Get started/i }).click();
  await expect(pick).toHaveAttribute('aria-pressed', 'false');
  await expect(inspector).toContainText('GetStartedButton');
  // Picking must not activate the playground's navigation command.
  await expect(page).toHaveURL(/\/playground\/index.html$/);
  await pick.click();
  await page.keyboard.press('Escape');
  await expect(pick).toHaveAttribute('aria-pressed', 'false');
  await pick.click();
  await inspector.getByRole('button', { name: 'Close runtime inspector' }).click();
  await expect(inspector).toHaveCount(0);
  await page.getByRole('button', { name: /Get started/i }).click();
  await expect(page).toHaveURL(/#\/guide$/);
});

test('resizes with keyboard and pointer, and uses navigable tabs on a compact screen', async ({
  page,
}, info) => {
  await page.goto('/playground/index.html');
  await page.getByRole('button', { name: 'Debug', exact: true }).click();

  const inspector = inspectorFor(page);
  const separator = inspector.getByRole('separator', { name: 'Resize runtime inspector' });
  await separator.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(separator).toHaveAttribute('aria-valuenow', '704');

  const before = await inspector.boundingBox();
  const bounds = await separator.boundingBox();
  await page.mouse.move(bounds!.x + 5, bounds!.y + 60);
  await page.mouse.down();
  await page.mouse.move(bounds!.x - 43, bounds!.y + 60, { steps: 4 });
  await page.mouse.up();

  const after = await inspector.boundingBox();
  expect(after!.width).toBeGreaterThan(before!.width + 40);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(inspector.getByRole('tab', { name: 'Hierarchy', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  await inspector
    .getByRole('searchbox', { name: 'Search runtime hierarchy' })
    .fill('GetStartedButton');

  await inspector
    .getByRole('treeitem', { name: 'GetStartedButton (TextButton)', exact: true })
    .click();

  const detailTab = inspector.getByRole('tab', { name: 'Details', exact: true });
  await expect(detailTab).toHaveAttribute('aria-selected', 'true');
  await expect(
    inspector.getByRole('searchbox', { name: 'Filter runtime properties' }),
  ).toBeVisible();

  const compact = await inspector.boundingBox();
  expect(compact!.x).toBeGreaterThanOrEqual(0);
  expect(compact!.x + compact!.width).toBeLessThanOrEqual(391);
  await page.screenshot({ path: info.outputPath('inspector-mobile.png') });
  await detailTab.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(inspector.getByRole('tab', { name: 'Hierarchy', exact: true })).toBeFocused();
  await expect(inspector.getByRole('tree', { name: 'Runtime hierarchy' })).toBeVisible();
});

test('keeps the inspector closed on page load and refresh', async ({ page }) => {
  await page.goto('/playground/index.html#/guide');
  await expect(inspectorFor(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Debug', exact: true }).click();
  await expect(inspectorFor(page)).toBeVisible();
  await page.reload();
  await expect(inspectorFor(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/index.html#\/guide$/);
  await page.getByRole('button', { name: 'Debug', exact: true }).click();
  await expect(inspectorFor(page)).toBeVisible();
});

test('does not serve separate debugging or workbench entries', async ({ request }) => {
  for (const path of ['/fkdebug', '/playground/workbench.html']) {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
  }
});

test('the same inspector binding inspects an independent FrameKit project and releases on root destruction', async ({
  page,
}) => {
  await page.goto('/tests/browser/index.html');
  await page.waitForFunction(() => Boolean(window.framekitDevtools));
  await page.evaluate(() => {
    const { createScreenGui, createTextButton, createUICorner, udim2FromOffset } = window.framekit;
    const app = createScreenGui({ Name: 'Independent project' });

    const child = createTextButton({
      Name: 'SubmitOrder',
      Text: 'Submit',
      Size: udim2FromOffset(120, 40),
    });

    child.Parent = app;

    const corner = createUICorner({ Name: 'RoundCorners', CornerRadius: 8 });
    corner.Parent = child;

    const remove = createTextButton({
      Text: 'Remove corner',
      Position: udim2FromOffset(140, 0),
      Size: udim2FromOffset(120, 40),
    });

    remove.Parent = app;
    remove.onClick(() => corner.destroy());
    child.on('click', () => app.destroy());
    app.mount('#root');
    window.framekitDevtools.bindRuntimeInspector(app);
  });
  await page.getByRole('button', { name: 'Debug', exact: true }).click();

  const inspector = inspectorFor(page);
  await expect(page).toHaveURL(/\/tests\/browser\/index.html$/);
  await expect(
    inspector.getByRole('treeitem', { name: 'Independent project (ScreenGui)', exact: true }),
  ).toBeVisible();
  await inspector.getByRole('searchbox', { name: 'Search runtime hierarchy' }).fill('RoundCorners');
  await inspector.getByRole('treeitem', { name: 'RoundCorners (UICorner)', exact: true }).click();
  await expect(inspector).toContainText('Class: UICorner');
  await page.getByRole('button', { name: 'Remove corner', exact: true }).click();
  await expect(inspector).toContainText('Class: ScreenGui');
  await expect(
    inspector.getByRole('treeitem', { name: 'RoundCorners (UICorner)', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(inspector).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Debug', exact: true })).toHaveCount(0);
  expect(
    await page
      .locator('style')
      .evaluateAll((styles) =>
        styles.some((style) => style.textContent?.includes('[data-fk-debug-panel]')),
      ),
  ).toBe(false);
});

for (const [entry, root] of [
  ['index.html', 'FrameKitPlayground'],
  ['collections.html', 'CollectionStressTest'],
] as const) {
  test(`uses the shared devtools launcher to inspect ${entry}`, async ({ page }) => {
    await page.goto(`/playground/${entry}`);
    await page.getByRole('button', { name: 'Debug', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/playground/${entry}$`));

    const inspector = inspectorFor(page);
    await expect(inspector).toBeVisible();
    await expect(
      inspector.getByRole('treeitem', { name: `${root} (ScreenGui)`, exact: true }),
    ).toBeVisible();
    await inspector.getByRole('button', { name: 'Close runtime inspector' }).click();
    await expect(page).toHaveURL(new RegExp(`/playground/${entry}$`));
    await expect(inspector).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Debug', exact: true })).toBeFocused();
  });
}

test('moves the floating inspector and resizes from all eight directions', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.goto('/playground/index.html');
  await page.getByRole('button', { name: 'Debug', exact: true }).click();

  const panel = inspectorFor(page);
  const header = panel.getByRole('group', { name: 'Move runtime inspector', exact: true });
  const beforeMove = (await panel.boundingBox())!;
  const title = (await header.boundingBox())!;
  await page.mouse.move(title.x + 120, title.y + 24);
  await page.mouse.down();
  await page.mouse.move(title.x - 180, title.y + 104, { steps: 4 });
  await page.mouse.up();

  const moved = (await panel.boundingBox())!;
  expect(moved.x).toBeCloseTo(beforeMove.x - 300);
  expect(moved.y).toBeCloseTo(beforeMove.y + 80);

  for (const [name, dx, dy] of [
    ['Resize runtime inspector', 32, 0],
    ['Resize inspector right edge', -32, 0],
    ['Resize inspector top edge', 0, 32],
    ['Resize inspector bottom edge', 0, -32],
    ['Resize inspector top left corner', 32, 32],
    ['Resize inspector top right corner', -32, 32],
    ['Resize inspector bottom left corner', 32, -32],
    ['Resize inspector bottom right corner', -32, -32],
  ] as const) {
    const start = (await panel.boundingBox())!;
    const handle = (await panel.getByRole('separator', { name, exact: true }).boundingBox())!;
    const x = handle.x + handle.width / 2;
    const y = handle.y + handle.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 4 });
    await page.mouse.up();

    const end = (await panel.boundingBox())!;

    if (dx) {
      expect(end.width).toBeCloseTo(start.width - 32);
    }

    if (dy) {
      expect(end.height).toBeCloseTo(start.height - 32);
    }

    if (name.includes('left') || name === 'Resize runtime inspector') {
      expect(end.x + end.width).toBeCloseTo(start.x + start.width);
    }

    if (name.includes('top')) {
      expect(end.y + end.height).toBeCloseTo(start.y + start.height);
    }
  }

  await header.focus();

  const beforeKey = (await panel.boundingBox())!;
  await page.keyboard.press('Shift+ArrowLeft');
  expect((await panel.boundingBox())!.x).toBeCloseTo(beforeKey.x - 8);
  await page.keyboard.press('Home');
  expect((await panel.boundingBox())!.width).toBeCloseTo(680);
  await page.setViewportSize({ width: 390, height: 500 });
  await expect(panel).toHaveCSS('width', '374px');

  const compact = (await panel.boundingBox())!;
  expect(compact.x).toBeGreaterThanOrEqual(8);
  expect(compact.x + compact.width).toBeLessThanOrEqual(382);
  expect(compact.y + compact.height).toBeLessThanOrEqual(492);
});

test('supports a shortcut without a launcher and removes it with the root', async ({ page }) => {
  await page.goto('/tests/browser/index.html');
  await page.waitForFunction(() => Boolean(window.framekitDevtools));
  await page.evaluate(() => {
    const root = window.framekit.createScreenGui();
    const destroy = window.framekit.createTextButton({ Text: 'Destroy inspected root' });
    destroy.Parent = root;
    destroy.onClick(() => root.destroy());
    root.mount('#root');
    window.framekitDevtools.bindRuntimeInspector(root, {
      button: false,
      shortcut: { key: 'i', ctrlKey: true, shiftKey: true },
    });
  });
  await expect(page.getByRole('button', { name: 'Debug', exact: true })).toHaveCount(0);
  await page.keyboard.press('Control+Shift+I');
  await expect(inspectorFor(page)).toBeVisible();
  await page.keyboard.press('Control+Shift+I');
  await expect(inspectorFor(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Destroy inspected root' }).click();
  await page.keyboard.press('Control+Shift+I');
  await expect(inspectorFor(page)).toHaveCount(0);
});

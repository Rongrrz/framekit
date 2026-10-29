import { expect, test } from '@playwright/test';

import { chooseDropdown, createProject } from './workbench-helpers';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/project-workbench/');
  await createProject(page, 'Welcome card');
});

test('starts in Hand, toggles with E only on canvas, and zooms keyboard shortcuts around the cursor', async ({
  page,
}) => {
  const viewport = page.getByRole('region', { name: 'Design canvas', exact: true });
  const canvas = page.locator('[data-workbench-canvas]');
  const hand = page.getByRole('button', { name: 'Hand tool', exact: true });
  await expect(hand).toHaveAttribute('aria-pressed', 'true');
  await viewport.focus();
  await page.keyboard.press('e');
  await expect(hand).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('e');
  await expect(hand).toHaveAttribute('aria-pressed', 'true');
  await chooseDropdown(page, 'Canvas zoom', '100%');
  const before = (await canvas.boundingBox())!;
  const stage = (await viewport.boundingBox())!;
  const point = { x: stage.x + 220, y: stage.y + 180 };
  await page.mouse.move(point.x, point.y);
  await viewport.focus();
  await page.keyboard.press('Control+=');
  const after = (await canvas.boundingBox())!;
  expect(after.width).toBeGreaterThan(before.width);
  expect(
    Math.abs(after.x + ((point.x - before.x) * after.width) / before.width - point.x),
  ).toBeLessThan(2);
  expect(
    Math.abs(after.y + ((point.y - before.y) * after.height) / before.height - point.y),
  ).toBeLessThan(2);
  await page.getByRole('treeitem', { name: 'Headline', exact: true }).click();
  const text = page.getByRole('textbox', { name: 'Text', exact: true });
  await text.fill('Type ');
  await text.press('e');
  await text.press('f');
  await expect(text).toHaveValue('Type ef');
  await expect(hand).toHaveAttribute('aria-pressed', 'true');
  await expect(text).toHaveCSS('outline-offset', '-1px');
  await expect(text).toHaveCSS('outline-width', '1px');
});

test('bounds navigation and locates a hierarchy selection with F', async ({ page }) => {
  const viewport = page.getByRole('region', { name: 'Design canvas', exact: true });
  await viewport.evaluate((element) => {
    element.scrollTo(1e9, 1e9);
  });
  await expect(page.locator('[data-workbench-canvas]')).toBeInViewport();
  const headline = page.getByRole('treeitem', { name: 'Headline', exact: true });
  await headline.click();
  await headline.press('f');
  await expect(page.locator('[data-scene-id="headline"]')).toBeInViewport();
  await expect(viewport).toBeFocused();
  const item = (await page.locator('[data-scene-id="headline"]').boundingBox())!;
  const stage = (await viewport.boundingBox())!;
  expect(Math.abs(item.y + item.height / 2 - stage.y - stage.height / 2)).toBeLessThan(2);
});

test('resizes panels beyond old limits, collapses to zero and restores them by dragging', async ({
  page,
}) => {
  for (const [name, sign] of [
    ['Explorer width', 1],
    ['Properties width', -1],
  ] as const) {
    const splitter = page.getByRole('separator', { name });
    let box = (await splitter.boundingBox())!;
    await page.mouse.move(box.x + 2, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 2 + 300 * sign, box.y + 100);
    await page.mouse.up();
    expect(Number(await splitter.getAttribute('aria-valuenow'))).toBeGreaterThan(500);
    await splitter.press('Home');
    await expect(splitter).toHaveAttribute('aria-valuenow', '0');
    box = (await splitter.boundingBox())!;
    await page.mouse.move(box.x + 2, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 2 + 280 * sign, box.y + 100);
    await page.mouse.up();
    await expect(splitter).toHaveAttribute('aria-valuenow', '280');
  }
  await page.reload();
  await expect(page.getByRole('separator', { name: 'Properties width' })).toHaveAttribute(
    'aria-valuenow',
    '280',
  );
});

test('combines orientations in one menu and expands advanced tools', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Canvas orientation', exact: true })).toHaveCount(
    0,
  );
  await chooseDropdown(page, 'Canvas resolution', 'Phone · 844 × 390 px · Landscape');
  await expect(page.locator('[data-workbench-canvas]')).toHaveCSS('width', '844px');
  await expect(page.getByRole('button', { name: 'Events', exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'More tools', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Events', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'More tools', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Events', exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Project settings', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'width', exact: true })).toHaveCount(0);
  await expect(page.getByText('Responsive website', { exact: true }).first()).toBeVisible();
});

test('edits, saves, resets and presents a phone override without changing desktop styles', async ({
  page,
}) => {
  await chooseDropdown(page, 'Layout editing', 'Phone · below 600 px');
  await page.getByRole('treeitem', { name: 'Headline', exact: true }).click();
  const size = page.getByRole('textbox', { name: 'TextSize', exact: true });
  await size.fill('23');
  await size.press('Enter');
  await expect(page.locator('[data-scene-id="headline"]')).toHaveCSS('font-size', '23px');
  await chooseDropdown(page, 'Layout editing', 'Desktop · 1024 px and up');
  await expect(size).toHaveValue('38');
  await expect(page.locator('[data-scene-id="headline"]')).toHaveCSS('font-size', '38px');
  await page.reload();
  await chooseDropdown(page, 'Layout editing', 'Phone · below 600 px');
  await page.getByRole('treeitem', { name: 'Headline', exact: true }).click();
  await expect(size).toHaveValue('23');
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  const frame = page.frameLocator('iframe[title="Presented project"]');
  const headline = frame.getByText('Make something persistent.', { exact: true });
  await expect(headline).toHaveCSS('font-size', '23px');
  await chooseDropdown(page, 'Presentation resolution', 'Desktop · 1440 × 900 px · Landscape');
  await expect(headline).toHaveCSS('font-size', '38px');
  await chooseDropdown(page, 'Presentation resolution', 'Phone · 390 × 844 px · Portrait');
  await expect(headline).toHaveCSS('font-size', '23px');
  await page.getByRole('button', { name: 'Exit presentation', exact: true }).click();
  await page.getByRole('button', { name: 'Reset device overrides', exact: true }).click();
  await expect(size).toHaveValue('38');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(size).toHaveValue('23');
});

test('keeps inherited prefab breakpoints consistent between editing and presentation', async ({
  page,
}) => {
  await page.evaluate(() => {
    const dimension = (width: number, height: number): object => ({
      X: { Scale: 0, Offset: width },
      Y: { Scale: 0, Offset: height },
    });
    const stored = JSON.parse(localStorage.getItem('framekit-workbench-projects-v1')!);
    stored[0].document = {
      version: 1,
      name: 'Responsive component',
      width: 960,
      height: 640,
      nodes: [
        {
          id: 'instance',
          type: 'TextLabel',
          parent: null,
          prefabId: 'component',
          properties: { Name: 'Component instance', Size: dimension(218, 80) },
          responsive: { desktop: { Size: dimension(300, 80) } },
        },
      ],
      prefabs: [
        {
          id: 'component',
          name: 'Device component',
          width: 200,
          height: 80,
          nodes: [
            {
              id: 'root',
              type: 'TextLabel',
              parent: null,
              properties: {
                Name: 'Component root',
                Text: 'Responsive component',
                Size: dimension(200, 80),
              },
              responsive: { phone: { Size: dimension(100, 80) } },
            },
          ],
        },
      ],
    };
    localStorage.setItem('framekit-workbench-projects-v1', JSON.stringify(stored));
  });
  await page.reload();
  await chooseDropdown(page, 'Canvas resolution', 'Phone · 390 × 844 px · Portrait');
  await expect(page.locator('[data-scene-id="instance"]')).toHaveCSS('width', '100px');
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  const component = page
    .frameLocator('iframe[title="Presented project"]')
    .locator('[data-framekit="TextLabel"]');
  await expect(component).toHaveCSS('width', '100px');
  await chooseDropdown(page, 'Presentation resolution', 'Tablet · 768 × 1024 px · Portrait');
  await expect(component).toHaveCSS('width', '218px');
  await chooseDropdown(page, 'Presentation resolution', 'Desktop · 1440 × 900 px · Landscape');
  await expect(component).toHaveCSS('width', '300px');
  await chooseDropdown(page, 'Presentation resolution', 'Phone · 390 × 844 px · Portrait');
  await expect(component).toHaveCSS('width', '100px');
});

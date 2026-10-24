import { expect, test, type Page } from '@playwright/test';

const dimension = (x: number, y: number): object => ({
  X: { Scale: 0, Offset: x },
  Y: { Scale: 0, Offset: y },
});

const openScene = async (page: Page, nodes: readonly object[]): Promise<void> => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.addInitScript((scene) => {
    localStorage.setItem(
      'framekit-workbench-projects-v1',
      JSON.stringify([
        {
          id: 'selection-regression',
          createdAt: 1,
          updatedAt: 1,
          document: {
            version: 1,
            name: 'Selection regression',
            width: 960,
            height: 640,
            nodes: scene,
          },
        },
      ]),
    );
  }, nodes);
  await page.goto('/project-workbench/index.html#/project/selection-regression');
};

/** Read an actual rendered pixel so changing only the selected object's z-index cannot pass. */
const colorAt = async (page: Page, x: number, y: number): Promise<readonly number[]> => {
  const png = await page.screenshot({
    clip: { x: Math.floor(x), y: Math.floor(y), width: 1, height: 1 },
    scale: 'css',
  });
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    return [...context.getImageData(0, 0, 1, 1).data];
  }, png.toString('base64'));
};

test('draws selection above opaque children and overlapping high-z siblings without changing the scene', async ({
  page,
}) => {
  await openScene(page, [
    {
      id: 'selected',
      type: 'Frame',
      parent: null,
      properties: {
        Name: 'Selected frame',
        Position: dimension(40, 40),
        Size: dimension(320, 200),
        ZIndex: 1,
      },
    },
    {
      id: 'child',
      type: 'Frame',
      parent: 'selected',
      properties: {
        Name: 'Opaque child',
        Position: dimension(0, 0),
        Size: dimension(320, 200),
        BackgroundColor3: { R: 255, G: 0, B: 0 },
        ZIndex: 2147483647,
      },
    },
    {
      id: 'sibling',
      type: 'Frame',
      parent: null,
      properties: {
        Name: 'Opaque sibling',
        Position: dimension(40, 40),
        Size: dimension(320, 200),
        BackgroundColor3: { R: 255, G: 0, B: 0 },
        ZIndex: 2147483647,
      },
    },
  ]);
  await page.getByRole('button', { name: '100%', exact: true }).click();
  const saved = await page.evaluate(() => localStorage.getItem('framekit-workbench-projects-v1'));
  await page.getByRole('treeitem', { name: 'Selected frame', exact: true }).click();
  const target = page.locator('[data-scene-id="selected"]');
  const bounds = (await target.boundingBox())!;
  await expect.poll(() => colorAt(page, bounds.x + 1, bounds.y + 60)).toEqual([61, 157, 255, 255]);
  await expect(target).toHaveCSS('z-index', '1');
  await expect(page.locator('[data-scene-id="sibling"]')).toHaveCSS('z-index', '2147483647');
  expect(await page.evaluate(() => localStorage.getItem('framekit-workbench-projects-v1'))).toBe(
    saved,
  );

  // The decoration must not intercept canvas selection or raise the selected scene object.
  await page.mouse.click(bounds.x + 1, bounds.y + 60);
  await expect(page.getByRole('treeitem', { name: 'Opaque sibling', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('selection follows nested rotation, zoom and scrolling, and clears for hidden or removed objects', async ({
  page,
}) => {
  await openScene(page, [
    {
      id: 'scroll',
      type: 'ScrollingFrame',
      parent: null,
      properties: {
        Name: 'Scroll region',
        Position: dimension(20, 20),
        Size: dimension(480, 360),
        ClipsDescendants: true,
      },
    },
    {
      id: 'group',
      type: 'Frame',
      parent: 'scroll',
      properties: {
        Name: 'Rotated group',
        Position: dimension(0, 0),
        Size: dimension(400, 1000),
        Rotation: 12,
      },
    },
    {
      id: 'target',
      type: 'Frame',
      parent: 'group',
      properties: {
        Name: 'Rotated target',
        Position: dimension(80, 240),
        Size: dimension(200, 80),
        Rotation: 17,
        AnchorPoint: { X: 0.3, Y: 0.8 },
      },
    },
    {
      id: 'stroke',
      type: 'UIStroke',
      parent: 'target',
      properties: { Name: 'Authored stroke', Thickness: 7, BorderStrokePosition: 'Inner' },
    },
  ]);
  await page.getByRole('treeitem', { name: 'Rotated target', exact: true }).click();
  const target = page.locator('[data-scene-id="target"]');
  const outline = page.locator('[data-selection-bounds]');
  const matchesTarget = async (): Promise<void> => {
    await expect(outline).toBeVisible();
    await expect
      .poll(async () => {
        const expected = (await target.boundingBox())!;
        const actual = (await outline.boundingBox())!;
        return Math.max(
          ...(['x', 'y', 'width', 'height'] as const).map((key) =>
            Math.abs(expected[key] - actual[key]),
          ),
        );
      })
      .toBeLessThan(1);
  };
  await matchesTarget();
  await expect(outline).toHaveCSS('rotate', '29deg');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: '50%', exact: true }).click();
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await matchesTarget();
  await expect(outline).toHaveCSS('box-shadow', 'rgb(61, 157, 255) 0px 0px 0px 2px inset');
  const before = (await target.boundingBox())!;
  await page.locator('[data-scene-id="scroll"]').evaluate((element) => {
    element.scrollTop = 120;
  });
  await expect.poll(async () => (await target.boundingBox())!.y).toBeLessThan(before.y - 40);
  await matchesTarget();
  await expect(target).toHaveCSS('box-shadow', 'rgb(203, 213, 225) 0px 0px 0px 7px inset');

  await page.getByRole('treeitem', { name: 'Authored stroke', exact: true }).click();
  await matchesTarget();
  await page.getByRole('treeitem', { name: 'Rotated target', exact: true }).click();
  await page.getByRole('button', { name: 'Visible', exact: true }).click();
  await expect(outline).not.toBeVisible();
  await page.getByRole('button', { name: 'Visible', exact: true }).click();
  await matchesTarget();
  await page.getByRole('button', { name: 'Canvas root', exact: true }).click();
  await expect(outline).not.toBeVisible();
  await page.getByRole('treeitem', { name: 'Rotated target', exact: true }).click();
  await page.keyboard.press('Delete');
  await expect(target).toHaveCount(0);
  await expect(page.locator('[data-scene-id="group"]')).toHaveAttribute(
    'data-workbench-selected',
    '',
  );
  await expect(outline).toHaveCSS('rotate', '12deg');
  await page.getByRole('button', { name: 'Canvas root', exact: true }).click();
  await expect(outline).not.toBeVisible();
});

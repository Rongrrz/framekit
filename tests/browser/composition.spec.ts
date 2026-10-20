import { expect, openFrameKit, test } from './fixtures.js';

test('floating content follows owner appearance live while local decorations retain precedence', async ({
  page,
}) => {
  await openFrameKit(page);
  await page.evaluate(() => {
    const {
      createScreenGui,
      createFrame,
      createTextButton,
      createTextLabel,
      createUIFocusRing,
      createUITextSelection,
      bindPopover,
      setAccessibility,
      color3FromRGB,
      udim2FromOffset,
    } = window.framekit;
    const root = createScreenGui({ ColorScheme: 'Dark' });
    const group = createFrame({ Size: udim2FromOffset(200, 80) });
    group.Parent = root;
    const ring = createUIFocusRing({ Color: color3FromRGB(0, 200, 100), Thickness: 4 });
    ring.Parent = group;
    const selection = createUITextSelection({ BackgroundColor3: color3FromRGB(200, 50, 0) });
    selection.Parent = group;
    const trigger = createTextButton({ Text: 'Open tools' });
    trigger.Parent = group;
    const panel = createFrame({ Size: udim2FromOffset(260, 120) });
    setAccessibility(panel, { label: 'Tools panel' });
    const change = createTextButton({
      Text: 'Change owner appearance',
      Size: udim2FromOffset(250, 36),
    });
    change.Parent = panel;
    const text = createTextLabel({
      Text: 'Selectable tools',
      Position: udim2FromOffset(0, 40),
      Size: udim2FromOffset(250, 32),
      TextSelectable: true,
    });
    text.Parent = panel;
    change.onClick(() => {
      root.ColorScheme = 'Light';
      ring.Color = color3FromRGB(100, 0, 200);
      selection.BackgroundColor3 = color3FromRGB(0, 100, 200);
      const local = createUIFocusRing({ Color: color3FromRGB(200, 100, 0), Thickness: 6 });
      local.Parent = panel;
      const release = createTextButton({
        Text: 'Release local ring',
        Position: udim2FromOffset(0, 80),
        Size: udim2FromOffset(240, 32),
      });
      release.Parent = panel;
      release.onClick(() => local.destroy());
    });
    bindPopover(trigger, panel, { onShow: () => {}, onHide: () => {} });
    root.mount('#root');
  });

  await page.getByRole('button', { name: 'Open tools' }).focus();
  await page.keyboard.press('ArrowDown');
  const change = page.getByRole('button', { name: 'Change owner appearance' });
  await expect(change).toBeFocused();
  await expect(change).toHaveCSS('color-scheme', 'dark');
  await expect(change).toHaveCSS('outline-color', 'rgb(0, 200, 100)');
  await expect(change).toHaveCSS('outline-width', '4px');
  const text = page.getByText('Selectable tools', { exact: true });
  await expect
    .poll(() => text.evaluate((node) => getComputedStyle(node, '::selection').backgroundColor))
    .toBe('rgb(200, 50, 0)');
  await page.keyboard.press('Enter');
  await expect(change).toHaveCSS('color-scheme', 'light');
  await expect(change).toHaveCSS('outline-color', 'rgb(200, 100, 0)');
  await expect(change).toHaveCSS('outline-width', '6px');
  await expect
    .poll(() => text.evaluate((node) => getComputedStyle(node, '::selection').backgroundColor))
    .toBe('rgb(0, 100, 200)');
  const release = page.getByRole('button', { name: 'Release local ring' });
  await release.focus();
  await page.keyboard.press('Enter');
  await expect(release).toHaveCSS('outline-color', 'rgb(100, 0, 200)');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('group', { name: 'Tools panel' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open tools' })).toBeFocused();
});

test('dragging and resizing preserve anchors and scale, honor bounds, and release active pointers on disposal', async ({
  page,
  browserName,
}) => {
  await openFrameKit(page);
  await page.evaluate(() => {
    const {
      createScreenGui,
      createFrame,
      createTextButton,
      createTextLabel,
      createUISizeConstraint,
      bindDraggable,
      bindResizable,
      setAccessibility,
      udim2,
      udim2FromOffset,
      vector2,
    } = window.framekit;
    const root = createScreenGui();
    const bounds = createFrame({
      Position: udim2FromOffset(100, 80),
      Size: udim2FromOffset(600, 500),
    });
    bounds.Parent = root;
    const panel = createFrame({
      Position: udim2(0.5, 0, 0.5, 0),
      AnchorPoint: vector2(0.5, 0.5),
      Size: udim2(0.5, -100, 0.4, 0),
    });
    setAccessibility(panel, { role: 'group', label: 'Inventory' });
    panel.Parent = bounds;
    createUISizeConstraint({ MinSize: vector2(120, 100), MaxSize: vector2(360, 300) }).Parent =
      panel;
    const header = createFrame({ Size: udim2(1, 0, 0, 40) });
    header.Parent = panel;
    setAccessibility(header, { role: 'group', label: 'Move inventory' });
    const child = createTextButton({ Text: 'Child command', Size: udim2FromOffset(100, 32) });
    child.Parent = header;
    const status = createTextLabel({ Text: 'Idle', Position: udim2FromOffset(800, 0) });
    status.Parent = root;
    child.onClick(() => {
      status.Text = 'Child activated';
    });
    const handle = createFrame({ Position: udim2(1, -20, 1, -20), Size: udim2FromOffset(20, 20) });
    handle.Parent = panel;
    setAccessibility(handle, { role: 'separator', label: 'Resize inventory' });
    const stopDrag = bindDraggable(panel, { handle: header, bounds, inset: 10 });
    const stopResize = bindResizable(panel, { handle, edge: 'BottomRight', bounds, inset: 10 });
    const dispose = createTextButton({
      Text: 'Dispose interactions',
      Position: udim2FromOffset(800, 80),
      Size: udim2FromOffset(200, 40),
    });
    dispose.Parent = root;
    dispose.onClick(() => {
      stopDrag();
      stopDrag();
      stopResize();
      status.Text = `Scale ${panel.Position.X.Scale}/${panel.Size.X.Scale}`;
    });
    root.mount('#root');
  });

  const panel = page.getByRole('group', { name: 'Inventory', exact: true });
  const header = page.getByRole('group', { name: 'Move inventory', exact: true });
  const handle = page.getByRole('separator', { name: 'Resize inventory' });
  const before = (await panel.boundingBox())!;
  await page.getByRole('button', { name: 'Child command' }).click();
  await expect(page.getByText('Child activated', { exact: true })).toBeVisible();
  expect((await panel.boundingBox())!.x).toBeCloseTo(before.x);
  const title = (await header.boundingBox())!;
  await page.mouse.move(title.x + 150, title.y + 20);
  await page.mouse.down();
  await page.mouse.move(title.x + 170, title.y + 40);
  await page.mouse.up();
  expect((await panel.boundingBox())!.x).toBeCloseTo(before.x + 20);
  expect((await panel.boundingBox())!.y).toBeCloseTo(before.y + 20);
  const moved = (await panel.boundingBox())!;
  await handle.focus();
  await page.keyboard.press('Shift+ArrowRight');
  expect((await panel.boundingBox())!.width).toBeCloseTo(moved.width + 8);
  expect((await panel.boundingBox())!.x).toBeCloseTo(moved.x);
  await page.keyboard.press('Home');
  expect((await panel.boundingBox())!.width).toBeCloseTo(120);
  expect((await panel.boundingBox())!.height).toBeCloseTo(100);
  await page.keyboard.press('End');
  expect((await panel.boundingBox())!.width).toBeCloseTo(360);
  expect((await panel.boundingBox())!.height).toBeCloseTo(300);

  if (browserName === 'chromium') {
    const session = await page.context().newCDPSession(page);
    const touchStart = (await header.boundingBox())!;
    const x = touchStart.x + 180;
    const y = touchStart.y + 20;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x - 40, y: y - 20 }],
    });
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect.poll(async () => (await panel.boundingBox())!.x).toBeCloseTo(touchStart.x - 40);
    await session.detach();
  }

  const boundedStart = (await header.boundingBox())!;
  await page.mouse.move(boundedStart.x + 150, boundedStart.y + 20);
  await page.mouse.down();
  await page.mouse.move(1100, 650);
  await page.mouse.up();
  expect((await panel.boundingBox())!.x).toBeCloseTo(330);
  expect((await panel.boundingBox())!.y).toBeCloseTo(270);

  await header.focus();
  await page.keyboard.press('ArrowLeft');
  const start = (await header.boundingBox())!;
  await page.mouse.move(start.x + 150, start.y + 20);
  await page.mouse.down();
  await page.mouse.move(start.x + 160, start.y + 20);
  await page
    .getByRole('button', { name: 'Dispose interactions' })
    .evaluate((node) => (node as HTMLElement).click());
  const disposed = (await panel.boundingBox())!;
  await page.mouse.move(900, 700);
  await page.mouse.up();
  expect((await panel.boundingBox())!.x).toBeCloseTo(disposed.x);
  await expect(page.getByText('Scale 0.5/0.5', { exact: true })).toBeVisible();
  await expect(header).not.toHaveAttribute('tabindex');
  await expect(header).toHaveCSS('touch-action', 'auto');
});

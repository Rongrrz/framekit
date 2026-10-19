import { expect, openFrameKit, test } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await openFrameKit(page);
  await page.evaluate(() => {
    const {
      bindVirtualList,
      createObservableValue,
      createScreenGui,
      createScrollingFrame,
      createTextButton,
      createTextLabel,
      udim2FromOffset,
      vector2,
    } = window.framekit;

    const gui = createScreenGui();

    const viewport = createScrollingFrame({
      Size: udim2FromOffset(320, 180),
      Position: udim2FromOffset(0, 60),
    });

    viewport.unsafeElement.setAttribute('aria-label', 'Measured rows');
    viewport.Parent = gui;

    const data = createObservableValue(
      Array.from({ length: 1000 }, (_, id) => ({ id, extra: false })),
    );

    const selection = createObservableValue<string | number | undefined>(0);

    const list = bindVirtualList(viewport, data, {
      itemHeight: { estimate: 48 },
      overscan: 3,
      selection,
      key: (item) => item.id,

      create: () =>
        createTextLabel({
          TextSize: 20,
          AutomaticSize: 'Y',
          TextWrapped: true,
          TextXAlignment: 'Left',
        }),

      update: (row, item) => {
        row.Text = `Row ${item.id}\n${'Wrapped content takes available width. '.repeat((item.id % 3) + 1)}${item.extra ? '\nExpanded details\nMore details\nLast details' : ''}`;
        row.unsafeElement.dataset.row = String(item.id);
      },
    });

    const jump = createTextButton({ Text: 'Jump', Size: udim2FromOffset(80, 40) });
    jump.Parent = gui;
    jump.onClick(() => {
      list.scrollToKey(40);
      selection.set(40);
      viewport.focus();
    });

    const expand = createTextButton({
      Text: 'Expand',
      Size: udim2FromOffset(80, 40),
      Position: udim2FromOffset(90, 0),
    });

    expand.Parent = gui;
    expand.onClick(() =>
      data.update((items) =>
        items.map((item) => (item.id === 39 ? { ...item, extra: !item.extra } : item)),
      ),
    );

    const prepend = createTextButton({
      Text: 'Prepend',
      Size: udim2FromOffset(80, 40),
      Position: udim2FromOffset(180, 0),
    });

    prepend.Parent = gui;
    prepend.onClick(() => data.update((items) => [{ id: -1, extra: false }, ...items]));

    const narrow = createTextButton({
      Text: 'Narrow',
      Size: udim2FromOffset(80, 40),
      Position: udim2FromOffset(270, 0),
    });

    narrow.Parent = gui;
    narrow.onClick(() => {
      viewport.Size = udim2FromOffset(220, 180);
    });

    const dispose = createTextButton({ Text: 'Dispose', Position: udim2FromOffset(360, 0) });
    dispose.Parent = gui;
    dispose.onClick(list.dispose);

    // A deterministic scroll anchor is set after estimates converge near the requested key.
    const anchor = createTextButton({ Text: 'Anchor row', Position: udim2FromOffset(480, 0) });
    anchor.Parent = gui;
    anchor.onClick(() => {
      const row = viewport.unsafeElement.querySelector<HTMLElement>('[data-row="40"]')!;
      viewport.CanvasPosition = vector2(0, parseFloat(row.style.top) + 7);
    });

    const remove = createTextButton({ Text: 'Remove selected', Position: udim2FromOffset(600, 0) });
    remove.Parent = gui;
    remove.onClick(() =>
      data.update((items) => items.filter((item) => item.id !== selection.get())),
    );
    gui.mount('#root');
  });
});

test('measures wrapped rows and preserves anchors across expansion, prepend, and width changes', async ({
  page,
}) => {
  const list = page.getByRole('listbox', { name: 'Measured rows' });
  await page.getByRole('button', { name: 'Jump', exact: true }).click();

  const row = list.locator('[data-row="40"]');
  await expect(row).toBeVisible();
  await expect
    .poll(() => row.evaluate((element) => element.getBoundingClientRect().height))
    .toBeGreaterThan(48);
  await page.getByRole('button', { name: 'Anchor row', exact: true }).click();

  const relativeTop = () =>
    row.evaluate(
      (element) =>
        element.getBoundingClientRect().top -
        element.closest('[role="listbox"]')!.getBoundingClientRect().top,
    );

  await expect.poll(relativeTop).toBeCloseTo(-7, 0);

  const previous = await list
    .locator('[data-row="39"]')
    .evaluate((element) => element.getBoundingClientRect().height);

  await page.getByRole('button', { name: 'Expand', exact: true }).click();
  await expect
    .poll(() =>
      list.locator('[data-row="39"]').evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeGreaterThan(previous);
  await expect.poll(relativeTop).toBeCloseTo(-7, 0);
  await page.getByRole('button', { name: 'Prepend', exact: true }).click();
  await expect.poll(relativeTop).toBeCloseTo(-7, 0);

  const height = await row.evaluate((element) => element.getBoundingClientRect().height);
  await page.getByRole('button', { name: 'Narrow', exact: true }).click();
  await expect
    .poll(() => row.evaluate((element) => element.getBoundingClientRect().height))
    .toBeGreaterThan(height);
  await expect.poll(relativeTop).toBeCloseTo(-7, 0);
  expect(await list.getByRole('option').count()).toBeLessThan(24);
});

test('keeps selection and keyboard navigation independent of mounted measured views and cleans up', async ({
  page,
}) => {
  const list = page.getByRole('listbox', { name: 'Measured rows' });
  await list.focus();
  await page.keyboard.press('End');
  await expect(list.locator('[data-row="999"]')).toHaveAttribute('aria-selected', 'true');
  await expect(list.locator('[data-row="999"]')).toBeInViewport();
  await expect(list).toBeFocused();
  await page.keyboard.press('Home');
  await expect(list.locator('[data-row="0"]')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('PageDown');
  await expect(list.locator('[aria-selected="true"]')).toBeVisible();
  await page.getByRole('button', { name: 'Remove selected' }).click();
  await expect(list.locator('[aria-selected="true"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Dispose', exact: true }).click();
  await expect(page.getByRole('option')).toHaveCount(0);
  await expect(page.locator('[data-framekit="ScrollingFrame"]')).not.toHaveAttribute('role');
});

test('demonstrates 100,000 measured rows with wrapped content and expansion in the playground', async ({
  page,
}) => {
  await page.goto('/playground/index.html#/examples');
  await page.getByRole('tab', { name: 'Measured rows', exact: true }).click();

  const list = page.getByRole('listbox', { name: 'Virtual collection' });
  const row = list.getByRole('option').first();
  await expect(row).toBeVisible();

  const height = await row.evaluate((element) => element.getBoundingClientRect().height);
  await page.getByRole('button', { name: 'Expand selected' }).click();
  await expect
    .poll(() => row.evaluate((element) => element.getBoundingClientRect().height))
    .toBeGreaterThan(height);
  await list.focus();
  await page.keyboard.press('End');
  await expect(list.getByRole('option').filter({ hasText: 'Row 99,999' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(list.getByRole('option').filter({ hasText: 'Row 99,999' })).toBeInViewport();
  expect(await list.getByRole('option').count()).toBeLessThan(64);
});

test('lets a caller scroll override an estimated keyboard jump before measurement', async ({
  page,
}) => {
  const list = page.getByRole('listbox', { name: 'Measured rows' });
  await list.evaluate((element) => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }),
    );
    element.scrollTop = 0;
  });

  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
  await expect(list.locator('[data-row="0"]')).toBeInViewport();
  expect(await list.evaluate((element) => element.scrollTop)).toBe(0);
  await expect(list).not.toHaveAttribute('aria-activedescendant');
});

test('does not accumulate scroll drift while earlier rows resize by fractional pixels', async ({
  page,
}) => {
  await openFrameKit(page);
  await page.evaluate(() => {
    const {
      createScrollingFrame,
      createObservableValue,
      createFrame,
      createTextButton,
      bindVirtualList,
      udim2FromOffset,
      vector2,
    } = window.framekit;

    const viewport = createScrollingFrame({
      Size: udim2FromOffset(300, 160),
      Position: udim2FromOffset(0, 60),
    });

    viewport.unsafeElement.setAttribute('aria-label', 'Fractional rows');
    document.body.append(viewport.unsafeElement);

    const rows = new Map<number, ReturnType<typeof createFrame>>();

    const list = bindVirtualList(
      viewport,
      createObservableValue(Array.from({ length: 100 }, (_, id) => id)),
      {
        itemHeight: { estimate: 32.25 },
        key: (id) => id,
        selection: createObservableValue<string | number | undefined>(undefined),

        create: (id) => {
          const row = createFrame({ Size: udim2FromOffset(300, 32.25) });
          row.unsafeElement.dataset.row = String(id);
          rows.set(id, row);
          row.onDestroy(() => rows.delete(id));

          return row;
        },
      },
    );

    list.scrollToKey(10);
    viewport.CanvasPosition = vector2(0, 10 * 32.25 + 7);

    const grow = createTextButton({ Text: 'Fractional growth' });
    document.body.append(grow.unsafeElement);
    grow.onClick(() => {
      const row = rows.get(9)!;
      row.Size = udim2FromOffset(300, row.Size.Y.Offset + 0.4);
    });
  });

  const row = page.getByRole('listbox', { name: 'Fractional rows' }).locator('[data-row="10"]');
  await expect(row).toBeInViewport();

  const offset = () =>
    row.evaluate(
      (element) =>
        element.getBoundingClientRect().top -
        element.closest('[role="listbox"]')!.getBoundingClientRect().top,
    );

  const before = await offset();

  for (let index = 0; index < 20; index += 1) {
    await page.getByRole('button', { name: 'Fractional growth' }).click();
    await page.evaluate(
      () =>
        new Promise((done) =>
          requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(done))),
        ),
    );
  }

  expect(Math.abs((await offset()) - before)).toBeLessThan(1);
});

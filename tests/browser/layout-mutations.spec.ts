import { expect, openFrameKit, test } from './fixtures.js';

test('size constraints compose with flexible rows and grids without rewriting preferred geometry', async ({
  page,
}) => {
  await openFrameKit(page);

  const result = await page.evaluate(() => {
    const {
      createFrame,
      createScreenGui,
      createUIListLayout,
      createUIGridLayout,
      createUIFlexItem,
      createUISizeConstraint,
      udim,
      udim2FromOffset,
      vector2,
    } = window.framekit;
    const root = createScreenGui();
    const row = createFrame({ Size: udim2FromOffset(400, 0), AutomaticSize: 'Y' });
    const list = createUIListLayout({ FillDirection: 'Horizontal', Padding: udim(0, 8) });
    list.Parent = row;
    row.Parent = root;
    const bounded = createFrame({ Size: udim2FromOffset(400, 200) });
    bounded.Parent = row;
    const flexible = createFrame({ Size: udim2FromOffset(0, 30) });
    createUIFlexItem().Parent = flexible;
    flexible.Parent = row;
    const constraint = createUISizeConstraint({
      MinSize: vector2(100, 30),
      MaxSize: vector2(240, 90),
    });
    constraint.Parent = bounded;
    root.mount('#root');

    const maximum = {
      width: bounded.AbsoluteSize.X,
      height: row.AbsoluteSize.Y,
      remaining: flexible.AbsoluteSize.X,
    };
    bounded.Size = udim2FromOffset(20, 10);
    const minimum = {
      width: bounded.AbsoluteSize.X,
      height: bounded.AbsoluteSize.Y,
      remaining: flexible.AbsoluteSize.X,
    };
    list.destroy();
    createUIGridLayout({ CellSize: udim2FromOffset(160, 80), FillDirectionMaxCells: 2 }).Parent =
      row;
    constraint.MaxSize = vector2(120, 40);
    const grid = { width: bounded.AbsoluteSize.X, height: bounded.AbsoluteSize.Y };
    constraint.Parent = undefined;
    const released = {
      width: bounded.AbsoluteSize.X,
      height: bounded.AbsoluteSize.Y,
      preferred: bounded.Size,
    };
    constraint.destroy();
    root.destroy();

    return { maximum, minimum, grid, released };
  });

  expect(result.maximum).toEqual({ width: 240, height: 90, remaining: 152 });
  expect(result.minimum).toEqual({ width: 100, height: 30, remaining: 292 });
  expect(result.grid).toEqual({ width: 120, height: 40 });
  expect(result.released).toEqual({
    width: 160,
    height: 80,
    preferred: { X: { Scale: 0, Offset: 20 }, Y: { Scale: 0, Offset: 10 } },
  });
});

test('responsive container layouts can change content height without resize-observer loops', async ({
  page,
}) => {
  await openFrameKit(page);

  const result = await page.evaluate(async () => {
    const {
      bindResponsiveLayout,
      createFrame,
      createScreenGui,
      createUIListLayout,
      udim2FromOffset,
    } = window.framekit;
    const errors: string[] = [];
    const record = (event: ErrorEvent): void => {
      errors.push(event.message);
    };
    window.addEventListener('error', record);
    const root = createScreenGui();
    const container = createFrame({ Size: udim2FromOffset(400, 0), AutomaticSize: 'Y' });
    createUIListLayout().Parent = container;
    const child = createFrame({ Size: udim2FromOffset(100, 20) });
    child.Parent = container;
    container.Parent = root;
    bindResponsiveLayout(container, {
      observe: container,
      breakpoints: [
        {
          maxWidth: 450,
          apply: () => {
            child.Size = udim2FromOffset(100, 20);
          },
        },
        {
          apply: () => {
            child.Size = udim2FromOffset(100, 80);
          },
        },
      ],
    });
    root.mount('#root');
    const settle = async (): Promise<void> => {
      for (let frame = 0; frame < 4; frame += 1) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
    };
    await settle();
    container.Size = udim2FromOffset(600, 0);
    await settle();
    const height = container.AbsoluteSize.Y;
    root.destroy();
    window.removeEventListener('error', record);

    return { errors, height };
  });

  expect(result).toEqual({ errors: [], height: 80 });
});

test('flexible list children share spare space, shrink, and return to their preferred sizes', async ({
  page,
}) => {
  await openFrameKit(page);

  const result = await page.evaluate(() => {
    const {
      createFrame,
      createScreenGui,
      createUIListLayout,
      createUIFlexItem,
      createUIPadding,
      udim,
      udim2FromOffset,
    } = window.framekit;
    const root = createScreenGui();
    const row = createFrame({ Size: udim2FromOffset(400, 60) });
    row.Parent = root;
    createUIListLayout({ FillDirection: 'Horizontal', Padding: udim(0, 8) }).Parent = row;
    createUIPadding({ PaddingLeft: udim(0, 10), PaddingRight: udim(0, 10) }).Parent = row;

    const first = createFrame({ Size: udim2FromOffset(80, 32) });
    const second = createFrame({ Size: udim2FromOffset(80, 32) });
    const fixed = createFrame({ Size: udim2FromOffset(40, 32) });
    const firstFlex = createUIFlexItem();
    const secondFlex = createUIFlexItem({ Weight: 3 });
    firstFlex.Parent = first;
    secondFlex.Parent = second;
    first.Parent = row;
    second.Parent = row;
    fixed.Parent = row;
    root.mount('#root');

    const widths = () => [first.AbsoluteSize.X, second.AbsoluteSize.X, fixed.AbsoluteSize.X];
    const wide = widths();
    row.Size = udim2FromOffset(160, 60);
    const narrow = widths();
    row.Size = udim2FromOffset(400, 60);
    secondFlex.Weight = 1;
    const equal = widths();
    firstFlex.destroy();
    const detached = widths();
    const preferred = first.Size.X.Offset;
    root.destroy();

    return { wide, narrow, equal, detached, preferred };
  });

  expect(result).toEqual({
    wide: [121, 203, 40],
    narrow: [42, 42, 40],
    equal: [162, 162, 40],
    detached: [80, 244, 40],
    preferred: 80,
  });
});

test('wrapped flexible rows grow their automatic height without stretching fixed children', async ({
  page,
}) => {
  await openFrameKit(page);

  const result = await page.evaluate(() => {
    const {
      createFrame,
      createScreenGui,
      createUIListLayout,
      createUIFlexItem,
      createUIPadding,
      udim,
      udim2FromOffset,
    } = window.framekit;
    const root = createScreenGui();
    const row = createFrame({ Size: udim2FromOffset(400, 0), AutomaticSize: 'Y' });
    row.Parent = root;
    createUIListLayout({ FillDirection: 'Horizontal', Wraps: true, Padding: udim(0, 8) }).Parent =
      row;
    createUIPadding({
      PaddingTop: udim(0, 10),
      PaddingBottom: udim(0, 10),
      PaddingLeft: udim(0, 10),
      PaddingRight: udim(0, 10),
    }).Parent = row;

    const children = Array.from({ length: 2 }, () => {
      const child = createFrame({ Size: udim2FromOffset(160, 40) });
      createUIFlexItem().Parent = child;
      child.Parent = row;
      return child;
    });
    root.mount('#root');

    const geometry = () => ({
      height: row.AbsoluteSize.Y,
      widths: children.map((child) => child.AbsoluteSize.X),
      heights: children.map((child) => child.AbsoluteSize.Y),
    });
    const wide = geometry();
    row.Size = udim2FromOffset(260, 0);
    const wrapped = geometry();
    root.destroy();

    return { wide, wrapped };
  });

  expect(result).toEqual({
    wide: { height: 60, widths: [186, 186], heights: [40, 40] },
    wrapped: { height: 108, widths: [240, 240], heights: [40, 40] },
  });
});

for (const kind of ['list', 'grid']) {
  test(`active ${kind} front edits preserve geometry and focused selection without rewriting survivors`, async ({
    page,
  }) => {
    await openFrameKit(page);

    const result = await page.evaluate((layoutKind) => {
      const {
        createScreenGui,
        createFrame,
        createTextInput,
        createUIGridLayout,
        createUIListLayout,
        udim2FromOffset,
      } = window.framekit;

      const gui = createScreenGui();
      const parent = createFrame({ Size: udim2FromOffset(200, 11000) });
      parent.Parent = gui;

      const layout =
        layoutKind === 'list'
          ? createUIListLayout()
          : createUIGridLayout({ CellSize: udim2FromOffset(100, 10), FillDirectionMaxCells: 1 });

      layout.Parent = parent;

      const rows = Array.from({ length: 1000 }, () => {
        const node = createFrame({ Size: udim2FromOffset(100, 10) });
        node.Parent = parent;

        return node;
      });

      const input = createTextInput({
        Text: 'Persistent selection',
        Size: udim2FromOffset(100, 10),
      });

      input.Parent = rows[500]!;
      gui.mount('#root');
      input.focus();
      input.unsafeElement.setSelectionRange(2, 8, 'backward');

      // Focus can scroll this tall container; native anchoring may scroll again after edits.
      const offset = (): number => rows[0]!.AbsolutePosition.Y - parent.AbsolutePosition.Y;
      const observer = new MutationObserver(() => undefined);

      for (const row of rows) {
        observer.observe(row.unsafeElement, { attributes: true });
      }

      const added = Array.from({ length: 100 }, () => {
        const node = createFrame({ LayoutOrder: -1, Size: udim2FromOffset(100, 10) });
        node.Parent = parent;

        return node;
      });

      const retainedAfterPrepend = rows.every(
        (row, index) => parent.unsafeElement.children[index + 100] === row.unsafeElement,
      );

      const prependOffset = offset();
      let cleanupOffset = -1;
      added[0]!.onDestroy(() => {
        cleanupOffset = offset();
      });

      for (const node of added) {
        node.destroy();
      }

      const result = {
        retainedAfterPrepend,
        prependOffset,
        cleanupOffset,
        removalOffset: offset(),
        retainedAfterRemoval: rows.every(
          (row, index) => parent.unsafeElement.children[index] === row.unsafeElement,
        ),
        survivorMutations: observer.takeRecords().length,
        focused: document.activeElement === input.unsafeElement,
        start: input.unsafeElement.selectionStart,
        end: input.unsafeElement.selectionEnd,
        direction: input.unsafeElement.selectionDirection,
      };

      observer.disconnect();
      gui.destroy();

      return result;
    }, kind);

    expect(result).toEqual({
      retainedAfterPrepend: true,
      prependOffset: 1000,
      cleanupOffset: 990,
      removalOffset: 0,
      retainedAfterRemoval: true,
      survivorMutations: 0,
      focused: true,
      start: 2,
      end: 8,
      direction: 'backward',
    });
  });

  test(`active ${kind} wrapping follows sorted DOM order after insertion and removal`, async ({
    page,
  }) => {
    await openFrameKit(page);

    const result = await page.evaluate((layoutKind) => {
      const {
        createScreenGui,
        createFrame,
        createUIGridLayout,
        createUIListLayout,
        udim2FromOffset,
      } = window.framekit;

      const gui = createScreenGui();
      const parent = createFrame({ Size: udim2FromOffset(200, 200) });
      parent.Parent = gui;

      const layout =
        layoutKind === 'list'
          ? createUIListLayout({ FillDirection: 'Horizontal', Wraps: true })
          : createUIGridLayout({ CellSize: udim2FromOffset(80, 20), FillDirectionMaxCells: 2 });

      layout.Parent = parent;

      const rows = [2, 0, 3, 1, 1].map((LayoutOrder) => {
        const node = createFrame({ LayoutOrder, Size: udim2FromOffset(80, 20) });
        node.Parent = parent;

        return node;
      });

      gui.mount('#root');

      const origin = parent.AbsolutePosition;
      const expected = [rows[1]!, rows[3]!, rows[4]!, rows[0]!, rows[2]!];

      const positions = () =>
        expected
          .filter((row) => !row.isDestroyed())
          .map((row) => {
            const position = row.AbsolutePosition;

            return [position.X - origin.X, position.Y - origin.Y];
          });

      const before = positions();
      rows[1]!.destroy();

      const after = positions();
      gui.destroy();

      return { before, after };
    }, kind);

    expect(result).toEqual({
      before: [
        [0, 0],
        [80, 0],
        [0, 20],
        [80, 20],
        [0, 40],
      ],
      after: [
        [0, 0],
        [80, 0],
        [0, 20],
        [80, 20],
      ],
    });
  });

  test(`active ${kind} removal updates geometry before cleanup and retains surviving focus`, async ({
    page,
  }) => {
    await openFrameKit(page);

    const result = await page.evaluate((layoutKind) => {
      const {
        createScreenGui,
        createFrame,
        createTextInput,
        createUIGridLayout,
        createUIListLayout,
        udim2FromOffset,
      } = window.framekit;

      const gui = createScreenGui();
      const parent = createFrame({ Size: udim2FromOffset(200, 200) });
      parent.Parent = gui;

      const layout =
        layoutKind === 'list'
          ? createUIListLayout()
          : createUIGridLayout({ CellSize: udim2FromOffset(100, 20), FillDirectionMaxCells: 1 });

      layout.Parent = parent;

      const rows = Array.from({ length: 5 }, (_, LayoutOrder) => {
        const node = createFrame({ LayoutOrder, Size: udim2FromOffset(100, 20) });
        node.Parent = parent;

        return node;
      });

      const input = createTextInput({
        Text: 'Persistent selection',
        Size: udim2FromOffset(100, 20),
      });

      input.Parent = rows[3]!;
      gui.mount('#root');
      input.focus();
      input.unsafeElement.setSelectionRange(1, 6);

      const top = parent.AbsolutePosition.Y;
      rows[0]!.Parent = undefined;

      const afterDetach = rows.slice(1).map((node) => node.AbsolutePosition.Y - top);
      let duringCleanup: number[] = [];
      rows[1]!.onDestroy(() => {
        duringCleanup = rows.slice(2).map((node) => node.AbsolutePosition.Y - top);
      });
      rows[1]!.destroy();

      const result = {
        afterDetach,
        duringCleanup,
        afterDestroy: rows.slice(2).map((node) => node.AbsolutePosition.Y - top),
        domOrder: [...parent.unsafeElement.children].every(
          (element, index) => element === rows[index + 2]!.unsafeElement,
        ),
        focused: document.activeElement === input.unsafeElement,
        start: input.unsafeElement.selectionStart,
        end: input.unsafeElement.selectionEnd,
      };

      rows[0]!.destroy();
      gui.destroy();

      return result;
    }, kind);

    expect(result).toEqual({
      afterDetach: [0, 20, 40, 60],
      duringCleanup: [0, 20, 40],
      afterDestroy: [0, 20, 40],
      domOrder: true,
      focused: true,
      start: 1,
      end: 6,
    });
  });

  test(`active ${kind} insertion updates geometry immediately and preserves focused selection`, async ({
    page,
  }) => {
    await openFrameKit(page);

    const result = await page.evaluate((layoutKind) => {
      const {
        createScreenGui,
        createFrame,
        createTextInput,
        createUIGridLayout,
        createUIListLayout,
        udim2FromOffset,
      } = window.framekit;

      const gui = createScreenGui();
      const parent = createFrame({ Size: udim2FromOffset(200, 200) });
      parent.Parent = gui;

      const layout =
        layoutKind === 'list'
          ? createUIListLayout()
          : createUIGridLayout({ CellSize: udim2FromOffset(100, 20), FillDirectionMaxCells: 1 });

      layout.Parent = parent;

      const input = createTextInput({
        Text: 'Persistent selection',
        LayoutOrder: 10,
        Size: udim2FromOffset(100, 20),
      });

      const last = createFrame({ LayoutOrder: 20, Size: udim2FromOffset(100, 20) });
      input.Parent = parent;
      last.Parent = parent;
      gui.mount('#root');
      input.focus();
      input.unsafeElement.setSelectionRange(2, 8, 'backward');

      const added = [0, 10, 5].map((LayoutOrder) => {
        const node = createFrame({ LayoutOrder, Size: udim2FromOffset(100, 20) });
        node.Parent = parent;

        return node;
      });

      const expected = [added[0]!, added[2]!, input, added[1]!, last];
      const top = parent.AbsolutePosition.Y;

      const result = {
        geometry: expected.map((node) => node.AbsolutePosition.Y - top),
        domOrder: [...parent.unsafeElement.children].every(
          (element, index) => element === expected[index]!.unsafeElement,
        ),
        focused: document.activeElement === input.unsafeElement,
        start: input.unsafeElement.selectionStart,
        end: input.unsafeElement.selectionEnd,
        direction: input.unsafeElement.selectionDirection,
      };

      gui.destroy();

      return result;
    }, kind);

    expect(result).toEqual({
      geometry: [0, 20, 40, 60, 80],
      domOrder: true,
      focused: true,
      start: 2,
      end: 8,
      direction: 'backward',
    });
  });
}

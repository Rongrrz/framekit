import { expect, openFrameKit, test } from './fixtures.js';

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

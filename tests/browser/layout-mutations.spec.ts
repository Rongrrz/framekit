import { expect, test } from '@playwright/test';

import type {} from './harness.js';

for (const kind of ['list', 'grid']) {
  test(`active ${kind} insertion updates geometry immediately and preserves focused selection`, async ({
    page,
  }) => {
    await page.goto('/tests/browser/index.html');
    await page.waitForFunction(() => Boolean(window.framekit));
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

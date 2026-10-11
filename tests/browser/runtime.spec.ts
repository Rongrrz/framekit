import { expect, test } from '@playwright/test';

import type {} from './harness.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/index.html');
  await page.waitForFunction(() => Boolean(window.framekit));
});

test('lays out real children and synchronizes native scroll position', async ({ page }) => {
  const result = await page.evaluate(() => {
    const {
      createScreenGui,
      createScrollingFrame,
      createFrame,
      createUIListLayout,
      udim2FromOffset,
    } = window.framekit;
    const gui = createScreenGui();
    const list = createScrollingFrame({
      Size: udim2FromOffset(200, 100),
      CanvasSize: udim2FromOffset(200, 500),
    });
    list.Parent = gui;
    createUIListLayout().Parent = list;
    const rows = Array.from({ length: 10 }, () => {
      const row = createFrame({ Size: udim2FromOffset(200, 50) });
      row.Parent = list;
      return row;
    });
    gui.mount('#root');
    list.unsafeElement.scrollTop = 120;
    list.unsafeElement.dispatchEvent(new Event('scroll'));
    const result = {
      height: rows[0]!.AbsoluteSize.Y,
      delta: rows[1]!.AbsolutePosition.Y - rows[0]!.AbsolutePosition.Y,
      scroll: list.CanvasPosition.Y,
    };
    gui.destroy();
    return result;
  });
  expect(result).toEqual({ height: 50, delta: 50, scroll: 120 });
});

test('direct assignments interrupt an animation in a real frame loop', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createScreenGui, createFrame, createTween } = window.framekit;
    const gui = createScreenGui();
    const node = createFrame();
    node.Parent = gui;
    gui.mount('#root');
    const tween = createTween(node, { Duration: 1 }, { Rotation: 90 });
    tween.play();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    node.Rotation = 12;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const result = { rotation: node.Rotation, state: tween.playbackState() };
    gui.destroy();
    return result;
  });
  expect(result).toEqual({ rotation: 12, state: 'Cancelled' });
});

test('repeated subtree lifetimes release watchers, events, animations, and DOM', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const {
      createScreenGui,
      createFrame,
      createTextButton,
      createObservableValue,
      watchOwnedValue,
      spring,
    } = window.framekit;
    const gui = createScreenGui();
    const left = createFrame();
    const right = createFrame();
    left.Parent = gui;
    right.Parent = gui;
    gui.mount('#root');
    const value = createObservableValue(0);
    let notifications = 0;
    let clicks = 0;
    for (let index = 0; index < 100; index += 1) {
      const subtree = createFrame();
      const button = createTextButton();
      button.Parent = subtree;
      subtree.Parent = left;
      watchOwnedValue(button, value, () => {
        notifications += 1;
      });
      button.onClick(() => {
        clicks += 1;
      });
      spring(button, { Rotation: 30 });
      subtree.Parent = right;
      subtree.destroy();
      value.set(index + 1);
      button.unsafeElement.click();
    }
    const remaining = gui.unsafeElement.querySelectorAll('*').length;
    gui.destroy();
    return {
      notifications,
      clicks,
      remaining,
      roots: document.querySelector('#root')!.childElementCount,
    };
  });
  expect(result).toEqual({ notifications: 100, clicks: 0, remaining: 2, roots: 0 });
});

test('captures dragging pointers outside the element bounds', async ({ page }) => {
  await page.evaluate(() => {
    const { createScreenGui, createFrame, udim2FromOffset } = window.framekit;
    const gui = createScreenGui();
    const drag = createFrame({ Size: udim2FromOffset(100, 100) });
    drag.unsafeElement.id = 'drag';
    drag.Parent = gui;
    gui.mount('#root');
    drag.on('pointerdown', (event) => drag.setPointerCapture(event.pointerId));
    drag.on('pointermove', (event) => {
      drag.unsafeElement.dataset.lastX = String(event.clientX);
    });
    drag.on('pointerup', (event) => drag.releasePointerCapture(event.pointerId));
  });
  await page.mouse.move(20, 20);
  await page.mouse.down();
  await page.mouse.move(250, 20);
  await expect(page.locator('#drag')).toHaveAttribute('data-last-x', '250');
  await page.mouse.up();
});

for (const nativeMove of [true, false]) {
  test(`preserves focus and text selection through reorder and reparent (native move: ${nativeMove})`, async ({
    page,
  }) => {
    const result = await page.evaluate((useNative) => {
      const { createScreenGui, createFrame, createTextInput } = window.framekit;
      const gui = createScreenGui();
      const left = createFrame();
      const right = createFrame();
      left.Parent = gui;
      right.Parent = gui;
      if (!useNative) {
        Object.defineProperty(left.unsafeElement, 'moveBefore', { value: undefined });
        Object.defineProperty(right.unsafeElement, 'moveBefore', { value: undefined });
      }
      const first = createFrame();
      const second = createFrame();
      first.Parent = left;
      second.Parent = left;
      const input = createTextInput({ Text: 'persistent selection' });
      input.Parent = second;
      gui.mount('#root');
      input.focus();
      input.unsafeElement.setSelectionRange(2, 8, 'backward');
      left.reorderChildren([second, first]);
      second.Parent = right;
      const result = {
        focused: document.activeElement === input.unsafeElement,
        start: input.unsafeElement.selectionStart,
        end: input.unsafeElement.selectionEnd,
        direction: input.unsafeElement.selectionDirection,
        sameElement: right.unsafeElement.firstElementChild === second.unsafeElement,
      };
      gui.destroy();
      return result;
    }, nativeMove);
    expect(result).toEqual({
      focused: true,
      start: 2,
      end: 8,
      direction: 'backward',
      sameElement: true,
    });
  });
}

test('layout sorting aligns visual order with native tab order', async ({ page }) => {
  await page.evaluate(() => {
    const { createScreenGui, createFrame, createTextButton, createUIListLayout } = window.framekit;
    const gui = createScreenGui();
    const parent = createFrame();
    parent.Parent = gui;
    const first = createTextButton({ Text: 'First', LayoutOrder: 2 });
    const second = createTextButton({ Text: 'Second', LayoutOrder: 1 });
    // Explicit tab stops also exercise WebKit with macOS keyboard navigation defaults.
    first.unsafeElement.tabIndex = 0;
    second.unsafeElement.tabIndex = 0;
    first.Parent = parent;
    second.Parent = parent;
    createUIListLayout().Parent = parent;
    gui.mount('#root');
    second.focus();
  });
  await expect(page.getByRole('button', { name: 'Second' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'First' })).toBeFocused();
});

test('keyed collection updates retain focused controls and release removed views', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const {
      createScreenGui,
      createFrame,
      createTextInput,
      createObservableValue,
      bindKeyedChildren,
    } = window.framekit;
    const gui = createScreenGui();
    const parent = createFrame();
    parent.Parent = gui;
    gui.mount('#root');
    const items = createObservableValue<readonly number[]>([1, 2]);
    let destroyed = 0;
    bindKeyedChildren(parent, items, {
      key: (id) => id,
      create: (id) => {
        const input = createTextInput({ Text: `item ${id}` });
        input.onDestroy(() => {
          destroyed += 1;
        });
        return input;
      },
    });
    const focused = parent.getChildren()[1]!;
    if (!focused.isA('TextInput')) {
      throw new Error('Expected an input');
    }
    focused.focus();
    focused.unsafeElement.setSelectionRange(1, 4);
    items.set([2, 3, 1]);
    const retained = parent.getChildren()[0] === focused;
    const selection = focused.unsafeElement.selectionStart;
    const active = document.activeElement === focused.unsafeElement;
    items.set([2]);
    const removed = destroyed;
    gui.destroy();
    return { retained, selection, active, removed, destroyed };
  });
  expect(result).toEqual({ retained: true, selection: 1, active: true, removed: 2, destroyed: 3 });
});

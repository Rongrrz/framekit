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

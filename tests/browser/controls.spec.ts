import { expect, test } from '@playwright/test';

import type {} from './harness.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/index.html');
  await page.waitForFunction(() => Boolean(window.framekit));
  await page.evaluate(() => {
    const {
      createScreenGui,
      createFrame,
      createTextButton,
      createTextInput,
      createUIListLayout,
      createObservableValue,
      bindTreeView,
      bindMenu,
      bindDialog,
      udim2FromOffset,
    } = window.framekit;
    const gui = createScreenGui();
    const tree = createFrame({ Size: udim2FromOffset(200, 200) });
    tree.unsafeElement.setAttribute('aria-label', 'Objects');
    tree.Parent = gui;
    createUIListLayout().Parent = tree;
    const rows = ['Folder', 'Alpha', 'Beta'].map((Text) => {
      const row = createTextButton({ Text, Size: udim2FromOffset(200, 32) });
      row.Parent = tree;
      return row;
    });
    const source = createObservableValue(
      rows.map((node, index) => ({
        node,
        label: node.Text,
        level: index === 0 ? 1 : 2,
        ...(index === 0 ? { expanded: true } : {}),
      })),
    );
    bindTreeView(tree, source, {
      onSelect: (node) =>
        (tree.unsafeElement.dataset.selected = node.unsafeElement.textContent ?? ''),
      onToggle: () => {
        source.set(
          source
            .get()
            .slice(0, 1)
            .map((item) => ({ ...item, expanded: false })),
        );
        rows.slice(1).forEach((row) => row.destroy());
      },
    });
    const trigger = createTextButton({ Text: 'Actions', Position: udim2FromOffset(250, 0) });
    trigger.Parent = gui;
    const menu = createFrame({ Size: udim2FromOffset(160, 96) });
    menu.Parent = gui;
    createUIListLayout().Parent = menu;
    const commands = ['Copy', 'Disabled', 'Delete'].map((Text) => {
      const item = createTextButton({
        Text,
        Disabled: Text === 'Disabled',
        Size: udim2FromOffset(160, 32),
      });
      item.Parent = menu;
      return item;
    });
    bindMenu(trigger, menu, commands);
    const openDialog = createTextButton({ Text: 'Open dialog', Position: udim2FromOffset(400, 0) });
    openDialog.Parent = gui;
    const dialog = createFrame(
      { Size: udim2FromOffset(300, 200), Position: udim2FromOffset(300, 180) },
      { tagName: 'dialog' },
    );
    dialog.unsafeElement.setAttribute('aria-label', 'Outer dialog');
    dialog.Parent = gui;
    const input = createTextInput({ Text: 'edit me', Size: udim2FromOffset(200, 40) });
    input.unsafeElement.setAttribute('aria-label', 'Dialog input');
    input.Parent = dialog;
    const outer = bindDialog(dialog, { initialFocus: input });
    openDialog.onClick(() => outer.open(openDialog));
    const inner = createFrame(
      { Size: udim2FromOffset(220, 120), Position: udim2FromOffset(350, 240) },
      { tagName: 'dialog' },
    );
    inner.unsafeElement.setAttribute('aria-label', 'Inner dialog');
    inner.Parent = dialog;
    const innerInput = createTextInput();
    innerInput.unsafeElement.setAttribute('aria-label', 'Inner input');
    innerInput.Parent = inner;
    const nested = bindDialog(inner, { initialFocus: innerInput });
    const nestedTrigger = createTextButton({
      Text: 'Open nested',
      Position: udim2FromOffset(0, 60),
    });
    nestedTrigger.Parent = dialog;
    nestedTrigger.onClick(() => nested.open(nestedTrigger));
    gui.mount('#root');
  });
});

test('tree navigation separates focus from selection and collapses focused descendants predictably', async ({
  page,
}) => {
  const tree = page.getByRole('tree', { name: 'Objects' });
  await tree.getByRole('treeitem', { name: 'Folder' }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(tree.getByRole('treeitem', { name: 'Alpha' })).toBeFocused();
  await page.keyboard.press('b');
  await expect(tree.getByRole('treeitem', { name: 'Beta' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(tree).toHaveAttribute('data-selected', 'Beta');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(tree.getByRole('treeitem', { name: 'Folder' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(tree.getByRole('treeitem')).toHaveCount(1);
  await expect(tree.getByRole('treeitem')).toBeFocused();
});

test('menu navigation skips disabled commands, supports typeahead, and restores focus on Escape', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'Actions' });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Copy' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
  await page.keyboard.press('c');
  await expect(page.getByRole('menuitem', { name: 'Copy' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('menu')).toBeHidden();
});

test('nested native dialogs contain focus and restore the opener one Escape at a time', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Open dialog', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Dialog input', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('textbox', { name: 'Dialog input', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Open nested' }).click();
  await expect(page.getByRole('textbox', { name: 'Inner input' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog', { name: 'Inner dialog' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Inner dialog' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open nested' })).toBeFocused();
  await expect(page.getByRole('dialog', { name: 'Outer dialog' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Outer dialog' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open dialog', exact: true })).toBeFocused();
});

test('menu activation works once for custom commands and stays inside a scrolled viewport', async ({
  page,
}) => {
  await page.evaluate(() => {
    const {
      createScreenGui,
      createFrame,
      createTextButton,
      createTextLabel,
      bindMenu,
      udim2FromOffset,
      vector2,
    } = window.framekit;
    const gui = createScreenGui();
    const trigger = createTextButton({ Text: 'Custom actions' });
    trigger.Parent = gui;
    const menu = createFrame({ Size: udim2FromOffset(160, 96) });
    menu.Parent = gui;
    menu.unsafeElement.dataset.testid = 'custom-menu';
    const command = createTextLabel({ Text: 'Run command', Size: udim2FromOffset(160, 32) });
    command.Parent = menu;
    const disabled = createTextLabel({
      Text: 'Blocked command',
      Position: udim2FromOffset(0, 32),
      Size: udim2FromOffset(160, 32),
    });
    disabled.unsafeElement.setAttribute('aria-disabled', 'true');
    disabled.Parent = menu;
    let count = 0;
    command.on('click', () => {
      menu.unsafeElement.dataset.count = String(++count);
    });
    disabled.on('click', () => {
      menu.unsafeElement.dataset.blocked = 'activated';
    });
    const controller = bindMenu(trigger, menu, [command, disabled]);
    gui.mount('#root');
    document.body.style.height = '2000px';
    window.scrollTo(0, 200);
    controller.open(vector2(innerWidth - 2, innerHeight - 2));
  });
  const menu = page.getByTestId('custom-menu');
  const bounds = await menu.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
  await menu
    .getByRole('menuitem', { name: 'Blocked command' })
    .evaluate((node: HTMLElement) => node.click());
  await expect(menu).not.toHaveAttribute('data-blocked');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Run command' })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(menu).toHaveAttribute('data-count', '1');
  await expect(menu).toBeHidden();
  await expect(page.getByRole('button', { name: 'Custom actions' })).toBeFocused();
});

test('invalid initial dialog focus fails before opening a modal or moving focus', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { createFrame, createTextButton, createTextInput, bindDialog } = window.framekit;
    const dialog = createFrame({}, { tagName: 'dialog' });
    document.body.append(dialog.unsafeElement);
    const input = createTextInput();
    input.Parent = dialog;
    const controller = bindDialog(dialog, { initialFocus: input });
    const opener = createTextButton();
    document.body.append(opener.unsafeElement);
    opener.focus();
    input.destroy();
    let rejected = false;
    try {
      controller.open(opener);
    } catch {
      rejected = true;
    }
    const result = {
      rejected,
      open: dialog.unsafeElement.hasAttribute('open'),
      focusKept: document.activeElement === opener.unsafeElement,
    };
    dialog.destroy();
    opener.destroy();
    return result;
  });
  expect(result).toEqual({ rejected: true, open: false, focusKept: true });
});

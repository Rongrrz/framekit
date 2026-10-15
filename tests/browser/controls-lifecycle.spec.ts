import { expect, test } from '@playwright/test';

import type {} from './harness.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/index.html');
  await page.waitForFunction(() => Boolean(window.framekit));
});

test('disposes an open menu repeatedly and restores caller attributes, position, and listeners', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { createFrame, createTextButton, bindMenu, udim2FromOffset } = window.framekit;
    const trigger = createTextButton({ Text: 'Original trigger' });
    const menu = createFrame({ Position: udim2FromOffset(12, 34), Size: udim2FromOffset(140, 40) });
    const item = createTextButton({ Text: 'Command' });
    item.Parent = menu;
    document.body.append(trigger.unsafeElement, menu.unsafeElement);
    trigger.unsafeElement.setAttribute('aria-controls', 'original-control');
    trigger.unsafeElement.setAttribute('aria-expanded', 'mixed');
    trigger.unsafeElement.setAttribute('aria-haspopup', 'listbox');
    menu.unsafeElement.id = 'original-menu';
    menu.unsafeElement.setAttribute('role', 'group');
    menu.unsafeElement.setAttribute('popover', 'manual');
    item.unsafeElement.setAttribute('role', 'link');
    item.unsafeElement.tabIndex = 3;
    const position = menu.Position;
    const binding = bindMenu(trigger, menu, [item]);
    binding.open();
    binding.dispose();
    binding.dispose();
    trigger.unsafeElement.click();
    const result = {
      open: menu.unsafeElement.matches(':popover-open'),
      trigger: ['aria-controls', 'aria-expanded', 'aria-haspopup'].map((name) =>
        trigger.unsafeElement.getAttribute(name),
      ),
      menu: ['id', 'role', 'popover'].map((name) => menu.unsafeElement.getAttribute(name)),
      item: [item.unsafeElement.getAttribute('role'), item.unsafeElement.tabIndex],
      positionRestored:
        menu.Position.X.Offset === position.X.Offset &&
        menu.Position.Y.Offset === position.Y.Offset,
      focused: document.activeElement === trigger.unsafeElement,
      retained: !menu.isDestroyed() && !item.isDestroyed(),
    };
    trigger.destroy();
    menu.destroy();
    return result;
  });
  expect(result).toEqual({
    open: false,
    trigger: ['original-control', 'mixed', 'listbox'],
    menu: ['original-menu', 'group', 'manual'],
    item: ['link', 3],
    positionRestored: true,
    focused: true,
    retained: true,
  });
});

test('outside-click dismissal synchronizes menu state and preserves the clicked control focus', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { createFrame, createTextButton, createTextInput, bindMenu, udim2FromOffset } =
      window.framekit;
    const trigger = createTextButton({ Text: 'Menu trigger' });
    const outside = createTextInput({
      AccessibleLabel: 'Outside',
      Position: udim2FromOffset(400, 0),
    });
    const menu = createFrame({ Size: udim2FromOffset(180, 60) });
    const item = createTextButton({ Text: 'Menu command' });
    item.Parent = menu;
    document.body.append(trigger.unsafeElement, menu.unsafeElement, outside.unsafeElement);
    bindMenu(trigger, menu, [item]);
  });
  await page.getByRole('button', { name: 'Menu trigger' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('textbox', { name: 'Outside', exact: true }).click();
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Menu trigger' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(page.getByRole('textbox', { name: 'Outside', exact: true })).toBeFocused();
});

for (const destroyOpener of [false, true]) {
  test(`closing and disposing a modal after opener destruction: ${destroyOpener}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const result = await page.evaluate((destroyOpener) => {
      const { createFrame, createTextButton, bindDialog } = window.framekit;
      const opener = createTextButton({ Text: 'Open' });
      const dialog = createFrame({ TagName: 'dialog' });
      const close = createTextButton({ Text: 'Close' });
      close.Parent = dialog;
      dialog.unsafeElement.setAttribute('aria-label', 'Lifetime modal');
      document.body.append(opener.unsafeElement, dialog.unsafeElement);
      const binding = bindDialog(dialog, { initialFocus: close });
      binding.open(opener);
      if (destroyOpener) {
        opener.destroy();
      }
      binding.dispose();
      binding.dispose();
      const result = {
        open: (dialog.unsafeElement as HTMLDialogElement).open,
        focusRestored: document.activeElement === opener.unsafeElement,
        retained: !dialog.isDestroyed() && !close.isDestroyed(),
      };
      dialog.destroy();
      opener.destroy();
      return result;
    }, destroyOpener);
    expect(result).toEqual({ open: false, focusRestored: !destroyOpener, retained: true });
    expect(errors).toEqual([]);
  });
}

test('destroying an open menu trigger or modal releases native top-layer state', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { createFrame, createTextButton, bindMenu, bindDialog } = window.framekit;
    const trigger = createTextButton();
    const menu = createFrame();
    const command = createTextButton();
    command.Parent = menu;
    document.body.append(trigger.unsafeElement, menu.unsafeElement);
    bindMenu(trigger, menu, [command]).open();
    trigger.destroy();
    const menuClosed = !menu.unsafeElement.matches(':popover-open');
    const attributesRestored =
      !menu.unsafeElement.hasAttribute('popover') && !command.unsafeElement.hasAttribute('role');
    menu.destroy();
    const dialog = createFrame({ TagName: 'dialog' });
    document.body.append(dialog.unsafeElement);
    const binding = bindDialog(dialog);
    binding.open();
    dialog.destroy();
    return {
      menuClosed,
      attributesRestored,
      modalClosed: !(dialog.unsafeElement as HTMLDialogElement).open,
    };
  });
  expect(result).toEqual({ menuClosed: true, attributesRestored: true, modalClosed: true });
});

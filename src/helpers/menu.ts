import type { GuiObject } from '#elements/gui-object.js';
import { preserveAttributes } from '#internal/dom/attributes.js';
import { installFrameKitStyles } from '#internal/dom/stylesheet.js';
import type { GuiElement } from '#internal/runtime/node/gui-node.js';
import { udim2FromOffset } from '#values/udim.js';
import type { Vector2 } from '#values/vector2.js';

import { createTypeahead, isTextEntry } from './composite-keyboard.js';

let nextMenuId = 0;

/** A single-level command menu using the browser's nonmodal popover top layer. */
export type MenuController = Readonly<{
  /** Opens below the trigger, or at a viewport position for a context menu. */
  open(position?: Vector2): void;
  close(): void;
  dispose(): void;
}>;

/** Adds menu navigation and light dismissal to caller-owned content and command items. */
export const bindMenu = (
  trigger: GuiElement,
  menu: GuiObject,
  items: readonly GuiElement[],
): MenuController => {
  const element = menu.unsafeElement;

  if (
    trigger.isDestroyed() ||
    menu.isDestroyed() ||
    trigger.unsafeElement.ownerDocument !== element.ownerDocument ||
    items.length === 0 ||
    new Set(items).size !== items.length ||
    items.some(
      (item) => item.isDestroyed() || item === menu || !element.contains(item.unsafeElement),
    )
  ) {
    throw new TypeError('Menu items must be descendants of the menu.');
  }

  installFrameKitStyles({ ownerDocument: element.ownerDocument });

  const typeahead = createTypeahead();

  const restoreTrigger = preserveAttributes(trigger.unsafeElement, [
    'aria-haspopup',
    'aria-expanded',
    'aria-controls',
  ]);
  const restoreMenu = preserveAttributes(element, ['role', 'popover', 'id']);
  const restoreItems = items.map((item) =>
    preserveAttributes(item.unsafeElement, ['role', 'tabindex']),
  );

  const originalPosition = menu.Position;

  if (!element.id) {
    do {
      nextMenuId += 1;
      element.id = `framekit-menu-${nextMenuId}`;
    } while (
      element.ownerDocument.getElementById(element.id) &&
      element.ownerDocument.getElementById(element.id) !== element
    );
  }

  trigger.unsafeElement.setAttribute('aria-controls', element.id);
  element.setAttribute('role', 'menu');
  element.popover = 'auto';
  trigger.unsafeElement.setAttribute('aria-haspopup', 'menu');
  trigger.unsafeElement.setAttribute('aria-expanded', 'false');
  items.forEach((item) => {
    item.unsafeElement.setAttribute('role', 'menuitem');
    item.unsafeElement.tabIndex = -1;
  });

  let disposed = false;

  const enabled = (): readonly GuiElement[] =>
    items.filter(
      (item) =>
        !item.isDestroyed() &&
        !item.unsafeElement.matches(':disabled, [aria-disabled="true"]') &&
        item.unsafeElement.getClientRects().length > 0,
    );

  const isOpen = (): boolean => element.matches(':popover-open');

  const close = (restore = true): void => {
    if (isOpen()) {
      element.hidePopover();
    }

    trigger.unsafeElement.setAttribute('aria-expanded', 'false');

    if (restore && !trigger.isDestroyed() && trigger.unsafeElement.isConnected) {
      trigger.focus();
    }
  };

  const open = (position?: Vector2): void => {
    if (disposed || menu.isDestroyed() || trigger.isDestroyed()) {
      throw new Error('Menu binding has been disposed.');
    }

    const bounds = trigger.unsafeElement.getBoundingClientRect();
    const x = position?.X ?? bounds.left;
    const y = position?.Y ?? bounds.bottom;
    menu.Position = udim2FromOffset(x, y);

    if (!isOpen()) {
      element.showPopover();
    }

    const window = element.ownerDocument.defaultView!;
    const menuBounds = element.getBoundingClientRect();
    const left = Math.max(0, Math.min(x, window.innerWidth - menuBounds.width));

    const top =
      !position && y + menuBounds.height > window.innerHeight
        ? Math.max(0, bounds.top - menuBounds.height)
        : Math.max(0, Math.min(y, window.innerHeight - menuBounds.height));

    // Correct against measured viewport geometry, including a scrolled document.
    menu.Position = udim2FromOffset(x + left - menuBounds.left, y + top - menuBounds.top);
    trigger.unsafeElement.setAttribute('aria-expanded', 'true');
    enabled()[0]?.focus();
  };

  const stops = [
    trigger.on('click', () => {
      if (isOpen()) {
        close();
      } else {
        open();
      }
    }),
    trigger.on('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        open();

        if (event.key === 'ArrowUp') {
          enabled().at(-1)?.focus();
        }
      }
    }),
    menu.on('toggle', () => trigger.unsafeElement.setAttribute('aria-expanded', String(isOpen()))),
    menu.on(
      'click',
      (event) => {
        const item = items.find((item) => item.unsafeElement.contains(event.target as Node));

        if (item?.unsafeElement.matches(':disabled, [aria-disabled="true"]')) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      { capture: true },
    ),
    menu.on('click', (event) => {
      if (enabled().some((item) => item.unsafeElement.contains(event.target as Node))) {
        close();
      }
    }),
    menu.on('keydown', (event) => {
      if (
        event.defaultPrevented ||
        isTextEntry(event.target) ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();

        return;
      }

      if (event.key === 'Tab') {
        close();

        return;
      }

      const controls = enabled();

      const index = controls.findIndex(
        (item) => item.unsafeElement === element.ownerDocument.activeElement,
      );

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        controls[index]?.unsafeElement.click();

        return;
      }

      let next: number | undefined;

      if (event.key === 'ArrowDown') {
        next = (index + 1) % controls.length;
      } else if (event.key === 'ArrowUp') {
        next = (index - 1 + controls.length) % controls.length;
      } else if (event.key === 'Home') {
        next = 0;
      } else if (event.key === 'End') {
        next = controls.length - 1;
      } else {
        next = typeahead(
          controls.map((item) => item.unsafeElement.textContent ?? ''),
          index,
          event,
        );
      }

      if (next !== undefined) {
        event.preventDefault();
        controls[next]?.focus();
      }
    }),
  ];

  const dispose = (): void => {
    if (disposed) {
      return;
    }

    disposed = true;
    unregisterTrigger();
    unregisterMenu();
    close(element.contains(element.ownerDocument.activeElement));
    stops.forEach((stop) => stop());
    restoreTrigger();
    restoreMenu();
    restoreItems.forEach((restore) => restore());

    if (!menu.isDestroyed()) {
      menu.Position = originalPosition;
    }
  };

  const unregisterTrigger = trigger.onDestroy(dispose);
  const unregisterMenu = menu.onDestroy(dispose);

  return Object.freeze({ open, close: () => close(), dispose });
};

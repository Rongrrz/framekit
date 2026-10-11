import type { GuiObject } from '#elements/gui-object.js';
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
  installFrameKitStyles({ ownerDocument: element.ownerDocument });
  if (
    items.length === 0 ||
    new Set(items).size !== items.length ||
    items.some((item) => !element.contains(item.unsafeElement))
  ) {
    throw new TypeError('Menu items must be descendants of the menu.');
  }
  const typeahead = createTypeahead();
  const savedTrigger = ['aria-haspopup', 'aria-expanded', 'aria-controls'].map((name) =>
    trigger.unsafeElement.getAttribute(name),
  );
  const savedMenu = ['role', 'popover'].map((name) => element.getAttribute(name));
  const savedItems = items.map((item) =>
    ['role', 'tabindex'].map((name) => item.unsafeElement.getAttribute(name)),
  );
  const originalPosition = menu.Position;
  const originalId = element.getAttribute('id');
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
    menu.Position = udim2FromOffset(position?.X ?? bounds.left, position?.Y ?? bounds.bottom);
    if (!isOpen()) {
      element.showPopover();
    }
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
    menu.on('click', (event) => {
      if (
        items.length === 0 ||
        new Set(items).size !== items.length ||
        items.some((item) => item.unsafeElement.contains(event.target as Node))
      ) {
        close();
      }
    }),
    menu.on('keydown', (event) => {
      if (event.defaultPrevented || isTextEntry(event.target) || event.isComposing) {
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
  const restore = (
    target: HTMLElement,
    names: readonly string[],
    values: readonly (string | null)[],
  ): void => {
    names.forEach((name, index) => {
      const value = values[index];
      if (value === null || value === undefined) {
        target.removeAttribute(name);
      } else {
        target.setAttribute(name, value);
      }
    });
  };
  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    unregisterTrigger();
    unregisterMenu();
    close(element.contains(element.ownerDocument.activeElement));
    stops.forEach((stop) => stop());
    restore(
      trigger.unsafeElement,
      ['aria-haspopup', 'aria-expanded', 'aria-controls'],
      savedTrigger,
    );
    restore(element, ['role', 'popover'], savedMenu);
    if (originalId === null) {
      element.removeAttribute('id');
    } else {
      element.id = originalId;
    }
    items.forEach((item, index) =>
      restore(item.unsafeElement, ['role', 'tabindex'], savedItems[index]!),
    );
    if (!menu.isDestroyed()) {
      menu.Position = originalPosition;
    }
  };
  const unregisterTrigger = trigger.onDestroy(dispose);
  const unregisterMenu = menu.onDestroy(dispose);
  return Object.freeze({ open, close: () => close(), dispose });
};

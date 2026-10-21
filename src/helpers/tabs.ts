import type { ButtonElement } from '#elements/button-events.js';
import type { GuiObject } from '#elements/gui-object.js';
import { preserveAttributes } from '#internal/dom/attributes.js';
import type { GuiElement } from '#internal/runtime/node/gui-node.js';
import { assertAllowedValue } from '#internal/validation.js';
import type { Unsubscribe } from '#state/signal.js';
import type { ObservableValue } from '#state/value.js';

import { setAccessibility } from './accessibility.js';
import { watchOwnedValue } from './owned-value.js';

/** One caller-owned tab button and its content panel, identified by application state. */
export type TabItem<Key extends string | number = string | number> = Readonly<{
  key: Key;
  tab: ButtonElement;
  panel: GuiObject;
}>;

/** Tabs use automatic activation when arrows move focus; panels retain their instances and state. */
export type TabsOptions<Key extends string | number = string | number> = Readonly<{
  selection: ObservableValue<Key>;
  orientation?: 'Horizontal' | 'Vertical';
}>;

/**
 * Binds a fixed set of tab buttons inside a tablist to panels outside it. Selection must name
 * a supplied key. Arrows wrap past disabled buttons; Home/End select the first/last enabled tab.
 * Owns panel visibility and tab semantics until disposed or any supplied node is destroyed.
 */
export const bindTabs = <Key extends string | number>(
  root: GuiElement,
  items: readonly TabItem<Key>[],
  options: TabsOptions<Key>,
): Unsubscribe => {
  const orientation = options.orientation ?? 'Horizontal';
  assertAllowedValue(orientation, ['Horizontal', 'Vertical'], 'tabs orientation');
  const entries = [...items];
  const element = root.unsafeElement;
  const nodes = entries.flatMap(({ tab, panel }) => [tab, panel]);

  const selectedItem = (): TabItem<Key> => {
    const selected = entries.find(({ key }) => key === options.selection.get());

    if (!selected) {
      throw new RangeError('Tab selection must name a supplied key.');
    }

    return selected;
  };

  if (
    root.isDestroyed() ||
    entries.length === 0 ||
    new Set(entries.map(({ key }) => key)).size !== entries.length ||
    new Set(nodes).size !== nodes.length ||
    nodes.some(
      (node) =>
        node.isDestroyed() ||
        node === root ||
        node.unsafeElement.ownerDocument !== element.ownerDocument,
    ) ||
    entries.some(
      ({ tab, panel }) =>
        !element.contains(tab.unsafeElement) ||
        element.contains(panel.unsafeElement) ||
        panel.unsafeElement.contains(element),
    ) ||
    entries.some(({ panel }) =>
      entries.some(
        (other) => other.panel !== panel && panel.unsafeElement.contains(other.panel.unsafeElement),
      ),
    )
  ) {
    throw new TypeError(
      'Tabs require unique live buttons inside the tablist and separate panels outside it.',
    );
  }

  selectedItem();

  const restoreRoot = preserveAttributes(element, ['role', 'aria-orientation']);
  const originals = entries.map(({ tab, panel }) => ({
    visible: panel.Visible,
    restoreTab: preserveAttributes(tab.unsafeElement, [
      'id',
      'role',
      'tabindex',
      'aria-selected',
      'aria-controls',
    ]),
    restorePanel: preserveAttributes(panel.unsafeElement, [
      'id',
      'role',
      'tabindex',
      'aria-labelledby',
    ]),
  }));
  let disposed = false;
  const stops: Unsubscribe[] = [];

  const dispose = (): void => {
    if (disposed) {
      return;
    }

    disposed = true;
    stops.forEach((stop) => stop());
    restoreRoot();
    entries.forEach(({ panel }, index) => {
      const original = originals[index]!;
      original.restoreTab();
      original.restorePanel();

      if (!panel.isDestroyed()) {
        panel.Visible = original.visible;
      }
    });
  };

  const update = (): void => {
    const selected = selectedItem();
    const focusable = selected.tab.Disabled ? entries.find(({ tab }) => !tab.Disabled) : selected;
    const active = element.ownerDocument.activeElement;
    const restoreFocus = entries.some(
      ({ tab, panel }) =>
        (tab.unsafeElement === active && tab !== focusable?.tab) ||
        (panel !== selected.panel && panel.unsafeElement.contains(active)),
    );

    for (const { tab, panel } of entries) {
      tab.unsafeElement.setAttribute('aria-selected', String(tab === selected.tab));
      tab.unsafeElement.tabIndex = tab === focusable?.tab ? 0 : -1;
      panel.Visible = panel === selected.panel;

      // Property observers can change selection or destroy the binding synchronously.
      if (disposed || options.selection.get() !== selected.key) {
        return;
      }
    }

    if (restoreFocus && focusable) {
      focusable.tab.focus();
    }
  };

  element.setAttribute('role', 'tablist');
  element.setAttribute(
    'aria-orientation',
    orientation === 'Horizontal' ? 'horizontal' : 'vertical',
  );
  stops.push(root.onDestroy(dispose));

  for (const { key, tab, panel } of entries) {
    setAccessibility(tab, { role: 'tab', controls: panel });
    setAccessibility(panel, { role: 'tabpanel', labelledBy: tab, focusable: true });
    stops.push(
      tab.onDestroy(dispose),
      panel.onDestroy(dispose),
      tab.onPropertyChanged('Disabled', update),
      tab.on('click', (event) => {
        if (!event.defaultPrevented && !tab.Disabled) {
          options.selection.set(key);
        }
      }),
      tab.on('keydown', (event) => {
        if (
          event.defaultPrevented ||
          event.isComposing ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          tab.Disabled ||
          event.target !== tab.unsafeElement
        ) {
          return;
        }

        const enabled = entries.filter(({ tab }) => !tab.Disabled);
        const index = enabled.findIndex((item) => item.tab === tab);
        const forward = orientation === 'Horizontal' ? 'ArrowRight' : 'ArrowDown';
        const backward = orientation === 'Horizontal' ? 'ArrowLeft' : 'ArrowUp';
        let next: TabItem<Key> | undefined;

        if (event.key === forward) {
          next = enabled[(index + 1) % enabled.length];
        } else if (event.key === backward) {
          next = enabled[(index - 1 + enabled.length) % enabled.length];
        } else if (event.key === 'Home') {
          next = enabled[0];
        } else if (event.key === 'End') {
          next = enabled.at(-1);
        } else {
          return;
        }

        event.preventDefault();

        if (next) {
          options.selection.set(next.key);

          if (!disposed) {
            next.tab.focus();
          }
        }
      }),
    );
  }

  stops.push(watchOwnedValue(root, options.selection, update));

  return dispose;
};

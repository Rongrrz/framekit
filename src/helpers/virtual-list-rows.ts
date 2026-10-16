import type { GuiObject } from '#elements/gui-object.js';
import type { ScrollingFrame } from '#elements/scrolling-frame.js';
import { createSignalEmitter } from '#state/signal.js';
import type { ObservableValue } from '#state/value.js';
import { udim2 } from '#values/udim.js';

import { isTextEntry } from './composite-keyboard.js';
import { bindKeyedChildren, type KeyedChildrenOptions } from './keyed-children.js';
import type { RowObserver } from './virtual-list-measurement.js';
import type { VirtualListModel, VirtualListEntry } from './virtual-list-model.js';

let nextRowId = 0;

/** Owns mounted option views, native row interaction, and active-descendant references. */
export const bindVirtualRows = <Item, Node extends GuiObject>(
  viewport: ScrollingFrame,
  content: GuiObject,
  model: VirtualListModel<Item>,
  options: Pick<KeyedChildrenOptions<Item, Node>, 'create' | 'update'> &
    Readonly<{ selection: ObservableValue<string | number | undefined> }>,
  observation: RowObserver,
): ((next: readonly VirtualListEntry<Item>[]) => void) => {
  const element = viewport.unsafeElement;
  const { measured, estimatedHeight, offset: offsetAt } = model;
  let visible: readonly VirtualListEntry<Item>[] = [];
  const visibleChanged = createSignalEmitter<[readonly VirtualListEntry<Item>[]]>();
  const views = new Map<string | number, Node>();
  bindKeyedChildren(
    content,
    { get: () => visible, onChange: visibleChanged.subscribe },
    {
      key: (entry) => entry.key,

      create: (entry) => {
        const node = options.create(entry.item);

        if (
          node.isDestroyed() ||
          node.Parent ||
          node.unsafeElement === element ||
          [...views.values()].includes(node)
        ) {
          throw new TypeError('A virtual row factory must return a unique, live, unattached view.');
        }

        if (!node.unsafeElement.id) {
          nextRowId += 1;
          node.unsafeElement.id = `framekit-option-${nextRowId}`;
        }

        node.unsafeElement.setAttribute('role', 'option');
        node.unsafeElement.tabIndex = -1;
        node.on('click', (event) => {
          if (!isTextEntry(event.target)) {
            options.selection.set(entry.key);
            viewport.focus({ preventScroll: true });
          }
        });
        views.set(entry.key, node);
        observation.observeRow(node.unsafeElement, entry.key);
        node.onDestroy(() => {
          observation.unobserveRow(node.unsafeElement);
          views.delete(entry.key);
        });

        return node;
      },

      update: (node, entry) => {
        options.update?.(node, entry.item, entry.index);
        node.setProperties({
          Position: udim2(0, 0, 0, offsetAt(entry.index)),
          Size: measured
            ? udim2(1, 0, node.Size.Y.Scale, node.Size.Y.Offset)
            : udim2(1, 0, 0, estimatedHeight),
        });
        node.unsafeElement.setAttribute('aria-posinset', String(entry.index + 1));
        node.unsafeElement.setAttribute('aria-setsize', String(model.entries.length));
      },
    },
  );

  content.onDestroy(() => {
    visible = [];
    views.clear();
  });

  return (next): void => {
    const previous = visible;

    if (next.length !== previous.length || next.some((entry, index) => entry !== previous[index])) {
      visible = next;

      try {
        visibleChanged.emit(next);
      } catch (error) {
        visible = previous;

        throw error;
      }
    }

    const selection = options.selection.get();

    for (const [key, view] of views) {
      if (measured) {
        view.Position = udim2(0, 0, 0, offsetAt(model.indexOf(key)!));
      }

      view.unsafeElement.setAttribute('aria-selected', String(key === selection));
    }

    const active = selection === undefined ? undefined : views.get(selection);

    if (active) {
      element.setAttribute('aria-activedescendant', active.unsafeElement.id);
    } else {
      element.removeAttribute('aria-activedescendant');
    }
  };
};

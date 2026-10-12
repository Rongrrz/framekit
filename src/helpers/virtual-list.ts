import { createFrame } from '#elements/frame.js';
import type { GuiObject } from '#elements/gui-object.js';
import type { ScrollingFrame } from '#elements/scrolling-frame.js';
import {
  assertNonNegativeFinite,
  assertPositiveFinite,
  assertInteger,
} from '#internal/validation.js';
import { createSignalEmitter } from '#state/signal.js';
import type { ObservableValue, ReadonlyObservableValue } from '#state/value.js';
import { udim2 } from '#values/udim.js';
import { vector2 } from '#values/vector2.js';

import { isTextEntry } from './composite-keyboard.js';
import { bindKeyedChildren, type KeyedChildrenOptions } from './keyed-children.js';
import { watchOwnedValue } from './owned-value.js';

/** Data selection persists independently of mounted views. Rows have one fixed pixel height. */
export type VirtualListOptions<Item, Node extends GuiObject> = KeyedChildrenOptions<Item, Node> &
  Readonly<{
    itemHeight: number;
    overscan?: number;
    selection: ObservableValue<string | number | undefined>;
  }>;

/** Controls the viewport without exposing or retaining offscreen views. */
export type VirtualListController = Readonly<{
  scrollToKey(key: string | number): void;
  dispose(): void;
}>;

type Entry<Item> = Readonly<{ item: Item; index: number; key: string | number }>;
let nextRowId = 0;

/**
 * Virtualizes a dedicated scrolling frame with listbox keyboard selection. Retained visible
 * keys keep their views. Offscreen views are destroyed; application data and selection remain.
 * Source changes preserve the first visible key and its pixel offset when that key survives.
 */
export const bindVirtualList = <Item, Node extends GuiObject>(
  viewport: ScrollingFrame,
  source: ReadonlyObservableValue<readonly Item[]>,
  options: VirtualListOptions<Item, Node>,
): VirtualListController => {
  assertPositiveFinite(options.itemHeight, 'Virtual list itemHeight');
  const overscan = options.overscan ?? 2;
  assertNonNegativeFinite(overscan, 'Virtual list overscan');
  assertInteger(overscan, 'Virtual list overscan');
  const element = viewport.unsafeElement;
  const saved = {
    CanvasSize: viewport.CanvasSize,
    CanvasPosition: viewport.CanvasPosition,
    AutomaticCanvasSize: viewport.AutomaticCanvasSize,
    ScrollingDirection: viewport.ScrollingDirection,
  };
  const attributes = ['role', 'tabindex', 'aria-activedescendant'];
  const originalAttributes = attributes.map((name) => element.getAttribute(name));
  const content = createFrame(
    { Name: 'VirtualListContent', BackgroundTransparency: 1 },
    { ownerDocument: element.ownerDocument },
  );
  content.Parent = viewport;
  element.setAttribute('role', 'listbox');
  element.tabIndex = 0;
  viewport.setProperties({ AutomaticCanvasSize: 'None', ScrollingDirection: 'Y' });
  let visible: readonly Entry<Item>[] = [];
  const visibleChanged = createSignalEmitter<[readonly Entry<Item>[]]>();
  const views = new Map<string | number, Node>();
  let entries: readonly Entry<Item>[] = [];
  let indices = new Map<string | number, number>();
  let disposed = false;
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
        node.onDestroy(() => views.delete(entry.key));
        return node;
      },
      update: (node, entry) => {
        options.update?.(node, entry.item, entry.index);
        node.setProperties({
          Position: udim2(0, 0, 0, entry.index * options.itemHeight),
          Size: udim2(1, 0, 0, options.itemHeight),
        });
        node.unsafeElement.setAttribute('aria-posinset', String(entry.index + 1));
        node.unsafeElement.setAttribute('aria-setsize', String(entries.length));
      },
    },
  );
  const render = (): void => {
    if (disposed || viewport.isDestroyed()) {
      return;
    }
    const top = element.scrollTop;
    const height = Math.max(options.itemHeight, element.clientHeight);
    const start = Math.max(0, Math.floor(top / options.itemHeight) - overscan);
    const end = Math.min(entries.length, Math.ceil((top + height) / options.itemHeight) + overscan);
    const next = entries.slice(start, end);
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
      view.unsafeElement.setAttribute('aria-selected', String(key === selection));
    }
    const active = selection === undefined ? undefined : views.get(selection);
    if (active) {
      element.setAttribute('aria-activedescendant', active.unsafeElement.id);
    } else {
      element.removeAttribute('aria-activedescendant');
    }
  };
  const scrollToKey = (key: string | number): void => {
    if (disposed) {
      throw new Error('Virtual list binding has been disposed.');
    }
    const index = indices.get(key);
    if (index === undefined) {
      return;
    }
    const top = index * options.itemHeight;
    const bottom = top + options.itemHeight;
    if (top < element.scrollTop) {
      viewport.CanvasPosition = vector2(0, top);
    } else if (bottom > element.scrollTop + element.clientHeight) {
      viewport.CanvasPosition = vector2(0, bottom - element.clientHeight);
    }
    render();
  };
  const updateSource = (items: readonly Item[]): void => {
    const next = items.map((item, index): Entry<Item> => ({ item, index, key: options.key(item) }));
    const nextIndices = new Map(next.map((entry) => [entry.key, entry.index]));
    if (nextIndices.size !== next.length) {
      throw new TypeError('Virtual list requires unique keys.');
    }
    const oldIndex = Math.floor(element.scrollTop / options.itemHeight);
    const selection = options.selection.get();
    const selectedIndex = selection === undefined ? oldIndex : (indices.get(selection) ?? oldIndex);
    const survivor = (from: number): Entry<Item> | undefined =>
      entries.find((entry, index) => index >= from && nextIndices.has(entry.key)) ??
      entries.findLast((entry, index) => index < from && nextIndices.has(entry.key));
    const anchor = survivor(oldIndex);
    const nextSelection = survivor(selectedIndex)?.key;
    const offset = element.scrollTop % options.itemHeight;
    entries = next;
    indices = nextIndices;
    const height = entries.length * options.itemHeight;
    content.Size = udim2(1, 0, 0, height);
    viewport.CanvasSize = udim2(1, 0, 0, height);
    const anchorIndex = anchor
      ? (indices.get(anchor.key) ?? Math.min(oldIndex, entries.length - 1))
      : 0;
    viewport.CanvasPosition = vector2(0, Math.max(0, anchorIndex * options.itemHeight + offset));
    if (selection !== undefined && !indices.has(selection)) {
      options.selection.set(
        nextSelection ?? entries[Math.min(selectedIndex, entries.length - 1)]?.key,
      );
    }
    render();
  };
  const stops: (() => void)[] = [];
  const ResizeObserverConstructor =
    element.ownerDocument.defaultView?.ResizeObserver ?? globalThis.ResizeObserver;
  const resize = new ResizeObserverConstructor(render);
  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    unregisterDestroy();
    stops.forEach((stop) => stop());
    resize.disconnect();
    content.destroy();
    entries = [];
    indices.clear();
    visible = [];
    views.clear();
    if (!viewport.isDestroyed()) {
      viewport.setProperties(saved);
    }
    attributes.forEach((name, index) => {
      const value = originalAttributes[index];
      if (value === null || value === undefined) {
        element.removeAttribute(name);
      } else {
        element.setAttribute(name, value);
      }
    });
  };
  const unregisterDestroy = viewport.onDestroy(dispose);
  try {
    stops.push(watchOwnedValue(viewport, source, updateSource));
    stops.push(watchOwnedValue(viewport, options.selection, render));
    stops.push(viewport.onPropertyChanged('CanvasPosition', render));
    stops.push(viewport.on('scroll', render));
    stops.push(
      viewport.on('keydown', (event) => {
        if (
          event.defaultPrevented ||
          isTextEntry(event.target) ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          event.isComposing ||
          entries.length === 0
        ) {
          return;
        }
        const selection = options.selection.get();
        const current = selection === undefined ? -1 : (indices.get(selection) ?? -1);
        const page = Math.max(1, Math.floor(element.clientHeight / options.itemHeight));
        let index: number;
        if (event.key === 'ArrowDown') {
          index = Math.min(current + 1, entries.length - 1);
        } else if (event.key === 'ArrowUp') {
          index = Math.max(current - 1, 0);
        } else if (event.key === 'Home') {
          index = 0;
        } else if (event.key === 'End') {
          index = entries.length - 1;
        } else if (event.key === 'PageDown') {
          index = Math.min(Math.max(0, current) + page, entries.length - 1);
        } else if (event.key === 'PageUp') {
          index = Math.max(current - page, 0);
        } else {
          return;
        }
        event.preventDefault();
        const key = entries[index]!.key;
        scrollToKey(key);
        options.selection.set(key);
      }),
    );
    resize.observe(element);
  } catch (error) {
    dispose();
    throw error;
  }
  return Object.freeze({ scrollToKey, dispose });
};

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
import { createRowGeometry } from './virtual-list-geometry.js';

/** Data selection persists independently of mounted views; heights can be fixed or measured. */
export type VirtualListOptions<Item, Node extends GuiObject> = KeyedChildrenOptions<Item, Node> &
  Readonly<{
    /** A fixed pixel height, or a positive estimate for measured rows whose heights are owned by the caller. */
    itemHeight: number | Readonly<{ estimate: number }>;
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
 * Measured mode observes row border boxes, preserving anchors during height and width changes;
 * unseen rows use estimates. Rows must have positive, untransformed, canvas-independent heights.
 */
export const bindVirtualList = <Item, Node extends GuiObject>(
  viewport: ScrollingFrame,
  source: ReadonlyObservableValue<readonly Item[]>,
  options: VirtualListOptions<Item, Node>,
): VirtualListController => {
  const measured = typeof options.itemHeight !== 'number';
  const estimatedHeight =
    typeof options.itemHeight === 'number' ? options.itemHeight : options.itemHeight.estimate;
  assertPositiveFinite(estimatedHeight, 'Virtual list itemHeight');
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
  const originalOverflowAnchor = element.style.getPropertyValue('overflow-anchor');
  const originalOverflowAnchorPriority = element.style.getPropertyPriority('overflow-anchor');
  // The binding preserves anchors across data and size changes; native anchoring would apply twice.
  element.style.setProperty('overflow-anchor', 'none');
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
  let pendingScroll: Readonly<{ key: string | number; top: number }> | undefined;
  const heights = new Map<string | number, number>();
  let geometry = createRowGeometry([]);
  let width = element.clientWidth;
  const window = element.ownerDocument.defaultView ?? globalThis;
  let resizeFrame: number | undefined;
  let pendingMeasurements: ResizeObserverEntry[] = [];
  const offsetAt = (index: number): number =>
    measured ? geometry.offset(index) : index * estimatedHeight;
  const heightAt = (index: number): number => (measured ? geometry.height(index) : estimatedHeight);
  const indexAt = (offset: number): number =>
    measured ? geometry.indexAt(offset) : Math.floor(offset / estimatedHeight);
  const setCanvasSize = (): void => {
    const height = offsetAt(entries.length);
    content.Size = udim2(1, 0, 0, height);
    viewport.CanvasSize = udim2(1, 0, 0, height);
  };
  const readAnchor = (): Readonly<{ index: number; offset: number }> => {
    const index = indexAt(element.scrollTop);
    return { index, offset: element.scrollTop - offsetAt(index) };
  };
  const restoreAnchor = (index: number, offset: number): void => {
    viewport.CanvasPosition = vector2(
      0,
      Math.max(0, offsetAt(index) + Math.min(offset, heightAt(index))),
    );
  };
  const ResizeObserverConstructor =
    element.ownerDocument.defaultView?.ResizeObserver ?? globalThis.ResizeObserver;
  const applyMeasurements = (changes: readonly ResizeObserverEntry[]): void => {
    if (disposed || viewport.isDestroyed()) {
      return;
    }
    // Only complete an estimated jump while the caller has kept the requested scroll position.
    const request = pendingScroll?.top === element.scrollTop ? pendingScroll : undefined;
    pendingScroll = undefined;
    const previous = readAnchor();
    let changed = false;
    if (measured && width !== element.clientWidth) {
      width = element.clientWidth;
      heights.clear();
      geometry = createRowGeometry(entries.map(() => estimatedHeight));
      changed = true;
    }
    if (measured) {
      for (const change of changes) {
        const key = [...views].find(([, view]) => view.unsafeElement === change.target)?.[0];
        const index = key === undefined ? undefined : indices.get(key);
        const height =
          change.borderBoxSize?.[0]?.blockSize ?? (change.target as HTMLElement).offsetHeight;
        if (index !== undefined && Number.isFinite(height) && height > 0) {
          heights.set(key!, height);
          if (height !== geometry.height(index)) {
            geometry.set(index, height);
            changed = true;
          }
        }
      }
    }
    if (changed) {
      setCanvasSize();
      restoreAnchor(previous.index, previous.offset);
    }
    if (request) {
      scrollToKey(request.key);
    } else {
      render();
    }
  };
  const resize = new ResizeObserverConstructor((changes) => {
    if (!measured) {
      render();
      return;
    }
    pendingMeasurements.push(...changes);
    // Updating an observed ancestor inside delivery causes ResizeObserver loop errors in WebKit.
    resizeFrame ??= window.requestAnimationFrame(() => {
      resizeFrame = undefined;
      const batch = pendingMeasurements;
      pendingMeasurements = [];
      applyMeasurements(batch);
    });
  });
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
        if (measured) {
          resize.observe(node.unsafeElement, { box: 'border-box' });
        }
        node.onDestroy(() => {
          resize.unobserve(node.unsafeElement);
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
        node.unsafeElement.setAttribute('aria-setsize', String(entries.length));
      },
    },
  );
  const render = (): void => {
    if (disposed || viewport.isDestroyed()) {
      return;
    }
    const top = element.scrollTop;
    const height = Math.max(estimatedHeight, element.clientHeight);
    const start = Math.max(0, indexAt(top) - overscan);
    const end = Math.min(
      entries.length,
      measured
        ? indexAt(top + height) + 1 + overscan
        : Math.ceil((top + height) / estimatedHeight) + overscan,
    );
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
      if (measured) {
        view.Position = udim2(0, 0, 0, offsetAt(indices.get(key)!));
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
  const scrollToKey = (key: string | number): void => {
    if (disposed) {
      throw new Error('Virtual list binding has been disposed.');
    }
    pendingScroll = undefined;
    const index = indices.get(key);
    if (index === undefined) {
      return;
    }
    const top = offsetAt(index);
    const bottom = top + heightAt(index);
    if (top < element.scrollTop) {
      viewport.CanvasPosition = vector2(0, top);
    } else if (bottom > element.scrollTop + element.clientHeight) {
      viewport.CanvasPosition = vector2(
        0,
        heightAt(index) > element.clientHeight ? top : bottom - element.clientHeight,
      );
    }
    render();
    if (measured && !heights.has(key)) {
      pendingScroll = { key, top: element.scrollTop };
    }
  };
  const updateSource = (items: readonly Item[]): void => {
    const next = items.map((item, index): Entry<Item> => ({ item, index, key: options.key(item) }));
    const nextIndices = new Map(next.map((entry) => [entry.key, entry.index]));
    if (nextIndices.size !== next.length) {
      throw new TypeError('Virtual list requires unique keys.');
    }
    pendingScroll = undefined;
    const { index: oldIndex, offset } = readAnchor();
    const selection = options.selection.get();
    const selectedIndex = selection === undefined ? oldIndex : (indices.get(selection) ?? oldIndex);
    const survivor = (from: number): Entry<Item> | undefined =>
      entries.find((entry, index) => index >= from && nextIndices.has(entry.key)) ??
      entries.findLast((entry, index) => index < from && nextIndices.has(entry.key));
    const anchor = survivor(oldIndex);
    const nextSelection = survivor(selectedIndex)?.key;
    if (measured) {
      for (const entry of entries) {
        const nextIndex = nextIndices.get(entry.key);
        if (nextIndex === undefined) {
          heights.delete(entry.key);
        }
      }
      geometry = createRowGeometry(next.map((entry) => heights.get(entry.key) ?? estimatedHeight));
    }
    entries = next;
    indices = nextIndices;
    setCanvasSize();
    const anchorIndex = anchor
      ? (indices.get(anchor.key) ?? Math.min(oldIndex, entries.length - 1))
      : 0;
    restoreAnchor(anchorIndex, offset);
    if (selection !== undefined && !indices.has(selection)) {
      options.selection.set(
        nextSelection ?? entries[Math.min(selectedIndex, entries.length - 1)]?.key,
      );
    }
    render();
  };
  const stops: (() => void)[] = [];
  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    pendingScroll = undefined;
    unregisterDestroy();
    stops.forEach((stop) => stop());
    resize.disconnect();
    if (resizeFrame !== undefined) {
      window.cancelAnimationFrame(resizeFrame);
    }
    pendingMeasurements = [];
    content.destroy();
    entries = [];
    indices.clear();
    visible = [];
    views.clear();
    heights.clear();
    geometry = createRowGeometry([]);
    if (!viewport.isDestroyed()) {
      viewport.setProperties(saved);
    }
    if (originalOverflowAnchor) {
      element.style.setProperty(
        'overflow-anchor',
        originalOverflowAnchor,
        originalOverflowAnchorPriority,
      );
    } else {
      element.style.removeProperty('overflow-anchor');
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
        const page = Math.max(1, Math.floor(element.clientHeight / estimatedHeight));
        const currentTop = offsetAt(Math.max(0, current));
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
          index = measured
            ? Math.max(
                Math.min(current + 1, entries.length - 1),
                indexAt(currentTop + element.clientHeight),
              )
            : Math.min(Math.max(0, current) + page, entries.length - 1);
        } else if (event.key === 'PageUp') {
          index = measured
            ? Math.min(
                Math.max(0, current - 1),
                indexAt(Math.max(0, currentTop - element.clientHeight)),
              )
            : Math.max(current - page, 0);
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

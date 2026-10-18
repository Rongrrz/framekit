import { createFrame } from '#elements/frame.js';
import type { GuiObject } from '#elements/gui-object.js';
import type { ScrollingFrame } from '#elements/scrolling-frame.js';
import { preserveAttributes } from '#internal/dom/attributes.js';
import { runCleanups } from '#internal/errors.js';
import { assertNonNegativeFinite, assertInteger } from '#internal/validation.js';
import type { ObservableValue, ReadonlyObservableValue } from '#state/value.js';
import { udim2 } from '#values/udim.js';
import { vector2 } from '#values/vector2.js';

import type { KeyedChildrenOptions } from './keyed-children.js';
import { watchOwnedValue } from './owned-value.js';
import { bindVirtualListKeyboard } from './virtual-list-keyboard.js';
import {
  observeVirtualRows,
  type RowMeasurement,
  type RowObserver,
} from './virtual-list-measurement.js';
import {
  createVirtualListModel,
  type VirtualItemHeight,
  type VirtualListEntry,
} from './virtual-list-model.js';
import { bindVirtualRows } from './virtual-list-rows.js';

/** Data selection persists independently of mounted views; heights can be fixed or measured. */
export type VirtualListOptions<Item, Node extends GuiObject> = KeyedChildrenOptions<Item, Node> &
  Readonly<{
    /** A fixed pixel height, or a positive estimate for measured rows whose heights are owned by the caller. */
    itemHeight: VirtualItemHeight;
    overscan?: number;
    selection: ObservableValue<string | number | undefined>;
  }>;

/** Controls the viewport without exposing or retaining offscreen views. */
export type VirtualListController = Readonly<{
  scrollToKey(key: string | number): void;
  dispose(): void;
}>;

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
  const element = viewport.unsafeElement;
  const model = createVirtualListModel(options.key, options.itemHeight, element.clientWidth);
  const { measured, estimatedHeight, offset: offsetAt, height: heightAt, indexAt } = model;
  const overscan = options.overscan ?? 2;
  assertNonNegativeFinite(overscan, 'Virtual list overscan');
  assertInteger(overscan, 'Virtual list overscan');

  const saved = {
    CanvasSize: viewport.CanvasSize,
    CanvasPosition: viewport.CanvasPosition,
    AutomaticCanvasSize: viewport.AutomaticCanvasSize,
    ScrollingDirection: viewport.ScrollingDirection,
  };

  const restoreAttributes = preserveAttributes(element, [
    'role',
    'tabindex',
    'aria-activedescendant',
  ]);
  const originalOverflowAnchor = element.style.getPropertyValue('overflow-anchor');
  const originalOverflowAnchorPriority = element.style.getPropertyPriority('overflow-anchor');

  const content = createFrame(
    { Name: 'VirtualListContent', BackgroundTransparency: 1 },
    { ownerDocument: element.ownerDocument },
  );

  let disposed = false;
  let observation: RowObserver | undefined;
  let renderRows: (next: readonly VirtualListEntry<Item>[]) => void;
  let pendingScroll: Readonly<{ key: string | number; top: number }> | undefined;
  let scrollCorrection: Readonly<{ actual: number; desired: number }> | undefined;

  const setCanvasSize = (): void => {
    const height = offsetAt(model.entries.length);
    content.Size = udim2(1, 0, 0, height);
    viewport.CanvasSize = udim2(1, 0, 0, height);
  };

  const readAnchor = (): Readonly<{ index: number; offset: number }> => {
    const top =
      scrollCorrection?.actual === element.scrollTop ? scrollCorrection.desired : element.scrollTop;

    const index = indexAt(top);

    return { index, offset: top - offsetAt(index) };
  };

  const restoreAnchor = (index: number, offset: number): void => {
    const desired = Math.max(0, offsetAt(index) + Math.min(offset, heightAt(index)));
    viewport.CanvasPosition = vector2(0, desired);

    const actual = element.scrollTop;
    // Preserve fractional intent across browser-rounded writes, but accept real range clamping.
    scrollCorrection = Math.abs(desired - actual) <= 1 ? { actual, desired } : undefined;
  };

  const applyMeasurements = (changes: readonly RowMeasurement[]): void => {
    if (disposed || viewport.isDestroyed()) {
      return;
    }

    const previous = readAnchor();
    const resized = model.resize(element.clientWidth);

    const request = pendingScroll?.top === element.scrollTop ? pendingScroll : undefined;

    pendingScroll = undefined;

    let changed = resized;

    for (const { key, height } of changes) {
      changed = model.measure(key, height) || changed;
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

  const render = (): void => {
    if (disposed || viewport.isDestroyed()) {
      return;
    }

    const top = element.scrollTop;
    const height = Math.max(estimatedHeight, element.clientHeight);
    const start = Math.max(0, indexAt(top) - overscan);

    const end = Math.min(
      model.entries.length,
      measured
        ? indexAt(top + height) + 1 + overscan
        : Math.ceil((top + height) / estimatedHeight) + overscan,
    );

    const next = model.entries.slice(start, end);
    renderRows(next);
  };

  const scrollToKey = (key: string | number): void => {
    if (disposed) {
      throw new Error('Virtual list binding has been disposed.');
    }

    pendingScroll = undefined;
    scrollCorrection = undefined;

    const index = model.indexOf(key);

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

    if (measured) {
      pendingScroll = { key, top: element.scrollTop };
    }
  };

  const updateSource = (items: readonly Item[]): void => {
    const previous = model.entries;
    const { index: oldIndex, offset } = readAnchor();
    const selection = options.selection.get();

    const selectedIndex =
      selection === undefined ? oldIndex : (model.indexOf(selection) ?? oldIndex);

    model.replace(items);
    pendingScroll = undefined;

    const survivor = (from: number): VirtualListEntry<Item> | undefined =>
      previous.find((entry, index) => index >= from && model.indexOf(entry.key) !== undefined) ??
      previous.findLast((entry, index) => index < from && model.indexOf(entry.key) !== undefined);

    const anchor = survivor(oldIndex);
    const nextSelection = survivor(selectedIndex)?.key;
    setCanvasSize();

    const anchorIndex = anchor
      ? (model.indexOf(anchor.key) ?? Math.min(oldIndex, model.entries.length - 1))
      : 0;

    restoreAnchor(anchorIndex, offset);

    if (selection !== undefined && model.indexOf(selection) === undefined) {
      options.selection.set(
        nextSelection ?? model.entries[Math.min(selectedIndex, model.entries.length - 1)]?.key,
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
    scrollCorrection = undefined;
    runCleanups(
      [
        unregisterDestroy,
        ...stops,
        () => observation?.dispose(),
        () => content.destroy(),

        () => {
          model.replace([]);

          if (!viewport.isDestroyed()) {
            viewport.setProperties(saved);
          }
        },

        () => {
          if (originalOverflowAnchor) {
            element.style.setProperty(
              'overflow-anchor',
              originalOverflowAnchor,
              originalOverflowAnchorPriority,
            );
          } else {
            element.style.removeProperty('overflow-anchor');
          }
        },

        restoreAttributes,
      ],
      'Multiple virtual list cleanups failed.',
    );
  };

  const unregisterDestroy = viewport.onDestroy(dispose);

  try {
    content.Parent = viewport;
    element.setAttribute('role', 'listbox');
    element.tabIndex = 0;
    // The binding owns anchoring; allowing native anchoring would apply corrections twice.
    element.style.setProperty('overflow-anchor', 'none');
    viewport.setProperties({ AutomaticCanvasSize: 'None', ScrollingDirection: 'Y' });
    observation = observeVirtualRows(
      element,
      measured,
      measured ? applyMeasurements : () => render(),
    );
    renderRows = bindVirtualRows(viewport, content, model, options, observation);
    stops.push(watchOwnedValue(viewport, source, updateSource));
    stops.push(
      watchOwnedValue(viewport, options.selection, (selected) => {
        if (pendingScroll && pendingScroll.key !== selected) {
          pendingScroll = undefined;
        }

        render();
      }),
    );
    stops.push(viewport.onPropertyChanged('CanvasPosition', render));
    stops.push(viewport.on('scroll', render));
    stops.push(bindVirtualListKeyboard(viewport, options.selection, model, scrollToKey));
  } catch (error) {
    try {
      dispose();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Virtual list setup and cleanup failed.');
    }

    throw error;
  }

  return Object.freeze({ scrollToKey, dispose });
};

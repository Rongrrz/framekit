import { assertPositiveFinite } from '#internal/validation.js';

import { createRowGeometry } from './virtual-list-geometry.js';

type Key = string | number;

export type VirtualItemHeight = number | Readonly<{ estimate: number }>;

export type VirtualListEntry<Item> = Readonly<{ item: Item; index: number; key: Key }>;

export type VirtualListModel<Item> = Readonly<{
  entries: readonly VirtualListEntry<Item>[];
  measured: boolean;
  estimatedHeight: number;
  indexOf(key: Key): number | undefined;
  offset(index: number): number;
  height(index: number): number;
  indexAt(offset: number): number;
  replace(items: readonly Item[]): void;
  resize(width: number): boolean;
  measure(key: Key, height: number): boolean;
}>;

/** Owns keyed data and its height index; browser observation and scroll intent stay in the binding. */
export const createVirtualListModel = <Item>(
  keyOf: (item: Item) => Key,
  itemHeight: VirtualItemHeight,
  initialWidth: number,
): VirtualListModel<Item> => {
  const measured = typeof itemHeight !== 'number';
  const estimatedHeight = typeof itemHeight === 'number' ? itemHeight : itemHeight.estimate;
  assertPositiveFinite(estimatedHeight, 'Virtual list itemHeight');

  let entries: readonly VirtualListEntry<Item>[] = [];
  let indices = new Map<Key, number>();
  const heights = new Map<Key, number>();
  let geometry = createRowGeometry([]);
  let width = initialWidth;

  return {
    get entries() {
      return entries;
    },

    measured,
    estimatedHeight,
    indexOf: (key): number | undefined => indices.get(key),
    offset: (index): number => (measured ? geometry.offset(index) : index * estimatedHeight),
    height: (index): number => (measured ? geometry.height(index) : estimatedHeight),

    indexAt: (offset): number =>
      measured ? geometry.indexAt(offset) : Math.floor(offset / estimatedHeight),

    replace: (items): void => {
      const next = items.map((item, index) => ({ item, index, key: keyOf(item) }));
      const nextIndices = new Map(next.map((entry) => [entry.key, entry.index]));

      if (nextIndices.size !== next.length) {
        throw new TypeError('Virtual list requires unique keys.');
      }

      if (measured) {
        for (const key of heights.keys()) {
          if (!nextIndices.has(key)) {
            heights.delete(key);
          }
        }

        geometry = createRowGeometry(
          next.map((entry) => heights.get(entry.key) ?? estimatedHeight),
        );
      }

      entries = next;
      indices = nextIndices;
    },

    resize: (nextWidth): boolean => {
      if (!measured || width === nextWidth) {
        return false;
      }

      width = nextWidth;
      heights.clear();
      geometry = createRowGeometry(entries.map(() => estimatedHeight));

      return true;
    },

    measure: (key, height): boolean => {
      const index = indices.get(key);

      if (index === undefined || !Number.isFinite(height) || height <= 0) {
        return false;
      }

      heights.set(key, height);

      if (height === geometry.height(index)) {
        return false;
      }

      geometry.set(index, height);

      return true;
    },
  };
};

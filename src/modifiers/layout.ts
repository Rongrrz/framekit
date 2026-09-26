import type { LayoutChild } from '#internal/runtime/node/modifier.js';

import type { HorizontalAlignment, SortOrder, VerticalAlignment } from './list-layout.js';

export function resolveChildOrders(
  children: readonly LayoutChild[],
  sortOrder: SortOrder,
): number[] {
  const sortedIndices = children.map((_, index) => index);
  sortedIndices.sort((leftIndex, rightIndex) => {
    const left = children[leftIndex]!;
    const right = children[rightIndex]!;
    const comparison =
      sortOrder === 'Name'
        ? left.Name.localeCompare(right.Name)
        : left.LayoutOrder - right.LayoutOrder;
    return comparison || leftIndex - rightIndex;
  });

  // CSS order changes visual placement while the hierarchy retains its insertion order.
  const orderByChild = children.map((_, index) => index);
  for (const [order, childIndex] of sortedIndices.entries()) {
    orderByChild[childIndex] = order;
  }
  return orderByChild;
}

export function resolveHorizontalAlignment(alignment: HorizontalAlignment): string {
  if (alignment === 'Center') {
    return 'center';
  }
  if (alignment === 'Right') {
    return 'flex-end';
  }
  return 'flex-start';
}

export function resolveVerticalAlignment(alignment: VerticalAlignment): string {
  if (alignment === 'Center') {
    return 'center';
  }
  if (alignment === 'Bottom') {
    return 'flex-end';
  }
  return 'flex-start';
}

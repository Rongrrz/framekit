import type { LayoutChild } from '#internal/runtime/node/modifier.js';

import type { HorizontalAlignment, SortOrder, VerticalAlignment } from './list-layout.js';

/** Equal keys retain explicit hierarchy order, including when a child is appended. */
export function resolveChildComparison(
  sortOrder: SortOrder,
): (left: LayoutChild, right: LayoutChild) => number {
  return sortOrder === 'Name' ? compareNames : compareLayoutOrders;
}

const compareNames = (left: LayoutChild, right: LayoutChild): number =>
  left.Name.localeCompare(right.Name);

const compareLayoutOrders = (left: LayoutChild, right: LayoutChild): number =>
  left.LayoutOrder - right.LayoutOrder;

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

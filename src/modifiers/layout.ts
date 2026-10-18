import type { LayoutChild } from '#internal/runtime/node/modifier.js';
import { assertAllowedValue } from '#internal/validation.js';

/** Primary axis used to arrange children. */
export type FillDirection = 'Horizontal' | 'Vertical';

/** Horizontal alignment of arranged children. */
export type HorizontalAlignment = 'Left' | 'Center' | 'Right';

/** Vertical alignment of arranged children. */
export type VerticalAlignment = 'Top' | 'Center' | 'Bottom';

/** Property used to sort children before layout. */
export type SortOrder = 'LayoutOrder' | 'Name';

type LayoutProperties = Readonly<{
  FillDirection: FillDirection;
  HorizontalAlignment: HorizontalAlignment;
  VerticalAlignment: VerticalAlignment;
  SortOrder: SortOrder;
}>;

export const validateLayoutProperties = (properties: LayoutProperties): void => {
  assertAllowedValue(properties.FillDirection, ['Horizontal', 'Vertical'], 'FillDirection');
  assertAllowedValue(
    properties.HorizontalAlignment,
    ['Left', 'Center', 'Right'],
    'HorizontalAlignment',
  );
  assertAllowedValue(
    properties.VerticalAlignment,
    ['Top', 'Center', 'Bottom'],
    'VerticalAlignment',
  );
  assertAllowedValue(properties.SortOrder, ['LayoutOrder', 'Name'], 'SortOrder');
};

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

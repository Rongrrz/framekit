import {
  createLayoutModifier,
  type LayoutChild,
  type LayoutModifier,
  type LayoutStyles,
  type Styles,
} from '../../runtime/modifier';
import type { InstanceProperties } from '../../runtime/node';
import { mergeProperties } from '../../runtime/node-properties';
import { assertAllowedValue, assertBoolean } from '../../runtime/validation';
import { assertUDim, udim, udimToCss, type UDim } from '../values/udim';

/** Primary axis used to arrange children. */
export type FillDirection = 'Horizontal' | 'Vertical';

/** Horizontal alignment of arranged children. */
export type HorizontalAlignment = 'Left' | 'Center' | 'Right';

/** Vertical alignment of arranged children. */
export type VerticalAlignment = 'Top' | 'Center' | 'Bottom';

/** Property used to sort children before layout. */
export type SortOrder = 'LayoutOrder' | 'Name';

/** Properties controlling automatic list layout. */
export type UIListLayoutProperties = InstanceProperties & {
  /** Primary axis used to arrange children. */
  FillDirection: FillDirection;
  /** Horizontal alignment of the arranged group. */
  HorizontalAlignment: HorizontalAlignment;
  /** Vertical alignment of the arranged group. */
  VerticalAlignment: VerticalAlignment;
  /** Gap between adjacent children. */
  Padding: UDim;
  /** Property used to sort children before layout. */
  SortOrder: SortOrder;
  /** Whether children continue on another row or column when needed. */
  Wraps: boolean;
};

/** An element-less layout node for direct GUI children. */
export type UIListLayout = LayoutModifier<UIListLayoutProperties>;

const fillDirections: readonly FillDirection[] = ['Horizontal', 'Vertical'];
const horizontalAlignments: readonly HorizontalAlignment[] = ['Left', 'Center', 'Right'];
const verticalAlignments: readonly VerticalAlignment[] = ['Top', 'Center', 'Bottom'];
const sortOrders: readonly SortOrder[] = ['LayoutOrder', 'Name'];

/** Creates a list layout that arranges its parent's direct GUI children. */
export function createUIListLayout(
  initialProperties: Partial<UIListLayoutProperties> = {},
): UIListLayout {
  return createLayoutModifier(
    'UIListLayout',
    mergeProperties(
      {
        Name: 'UIListLayout',
        FillDirection: 'Vertical',
        HorizontalAlignment: 'Left',
        VerticalAlignment: 'Top',
        Padding: udim(0, 0),
        SortOrder: 'LayoutOrder',
        Wraps: false,
      },
      initialProperties,
    ),
    resolveListLayout,
    validateListLayoutProperties,
  );
}

function resolveListLayout(
  properties: Readonly<UIListLayoutProperties>,
  children: readonly LayoutChild[],
): LayoutStyles {
  const isHorizontal = properties.FillDirection === 'Horizontal';
  const childOrders = resolveChildOrders(children, properties.SortOrder);
  const horizontalAlignment = resolveHorizontalAlignment(properties.HorizontalAlignment);
  const verticalAlignment = resolveVerticalAlignment(properties.VerticalAlignment);
  const mainAxisAlignment = isHorizontal ? horizontalAlignment : verticalAlignment;
  const crossAxisAlignment = isHorizontal ? verticalAlignment : horizontalAlignment;

  return {
    parent: {
      display: 'flex',
      'flex-direction': isHorizontal ? 'row' : 'column',
      'flex-wrap': properties.Wraps ? 'wrap' : 'nowrap',
      gap: udimToCss(properties.Padding),
      'justify-content': mainAxisAlignment,
      'align-items': crossAxisAlignment,
      'align-content': crossAxisAlignment,
    },
    children: children.map(
      (_, index): Styles => ({
        position: 'relative',
        left: 'auto',
        top: 'auto',
        transform: 'none',
        'flex-shrink': '0',
        order: String(childOrders[index]),
      }),
    ),
  };
}

function validateListLayoutProperties(properties: Readonly<UIListLayoutProperties>): void {
  assertAllowedValue(properties.FillDirection, fillDirections, 'FillDirection');
  assertAllowedValue(properties.HorizontalAlignment, horizontalAlignments, 'HorizontalAlignment');
  assertAllowedValue(properties.VerticalAlignment, verticalAlignments, 'VerticalAlignment');
  assertAllowedValue(properties.SortOrder, sortOrders, 'SortOrder');
  assertBoolean(properties.Wraps, 'Wraps');
  assertUDim(properties.Padding, 'Padding');
}

function resolveChildOrders(children: readonly LayoutChild[], sortOrder: SortOrder): number[] {
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
  for (const [order, childIndex] of sortedIndices.entries()) orderByChild[childIndex] = order;
  return orderByChild;
}

function resolveHorizontalAlignment(alignment: HorizontalAlignment): string {
  if (alignment === 'Center') return 'center';
  if (alignment === 'Right') return 'flex-end';
  return 'flex-start';
}

function resolveVerticalAlignment(alignment: VerticalAlignment): string {
  if (alignment === 'Center') return 'center';
  if (alignment === 'Bottom') return 'flex-end';
  return 'flex-start';
}

import {
  createLayoutModifier,
  type LayoutChild,
  type LayoutNode,
  type LayoutStyles,
  type Styles,
} from '../runtime/modifier';
import { mergeProperties, type NodeProperties } from '../runtime/node-state';
import { assertAllowedValue, assertBoolean } from '../runtime/validation';
import { udim, udimToCss, type UDim } from '../values/udim';

/** Primary axis used to arrange children. */
export type FillDirection = 'Horizontal' | 'Vertical';

/** Horizontal alignment of arranged children. */
export type HorizontalAlignment = 'Left' | 'Center' | 'Right';

/** Vertical alignment of arranged children. */
export type VerticalAlignment = 'Top' | 'Center' | 'Bottom';

/** Property used to sort children before layout. */
export type SortOrder = 'LayoutOrder' | 'Name';

/** Properties controlling automatic list layout. */
export type UIListLayoutProperties = NodeProperties & {
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
export type UIListLayoutNode = LayoutNode<UIListLayoutProperties>;

const fillDirections: readonly FillDirection[] = ['Horizontal', 'Vertical'];
const horizontalAlignments: readonly HorizontalAlignment[] = ['Left', 'Center', 'Right'];
const verticalAlignments: readonly VerticalAlignment[] = ['Top', 'Center', 'Bottom'];
const sortOrders: readonly SortOrder[] = ['LayoutOrder', 'Name'];

/** Creates a list layout that arranges its parent's direct GUI children. */
export function createUIListLayout(
  initial: Partial<UIListLayoutProperties> = {},
): UIListLayoutNode {
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
      initial,
    ),
    resolveListLayout,
  );
}

function resolveListLayout(
  properties: Readonly<UIListLayoutProperties>,
  children: readonly LayoutChild[],
): LayoutStyles {
  assertAllowedValue(properties.FillDirection, fillDirections, 'FillDirection');
  assertAllowedValue(properties.HorizontalAlignment, horizontalAlignments, 'HorizontalAlignment');
  assertAllowedValue(properties.VerticalAlignment, verticalAlignments, 'VerticalAlignment');
  assertAllowedValue(properties.SortOrder, sortOrders, 'SortOrder');
  assertBoolean(properties.Wraps, 'Wraps');
  const isHorizontal = properties.FillDirection === 'Horizontal';
  const orderedChildren = children
    .map((child, originalIndex) => ({ child, originalIndex }))
    .sort((left, right) => compareChildren(left, right, properties.SortOrder));
  const displayOrder = new Map(
    orderedChildren.map(({ originalIndex }, order) => [originalIndex, order]),
  );

  return {
    parent: {
      display: 'flex',
      'flex-direction': isHorizontal ? 'row' : 'column',
      'flex-wrap': properties.Wraps ? 'wrap' : 'nowrap',
      gap: udimToCss(properties.Padding),
      'justify-content': isHorizontal
        ? resolveHorizontalAlignment(properties.HorizontalAlignment)
        : resolveVerticalAlignment(properties.VerticalAlignment),
      'align-items': isHorizontal
        ? resolveVerticalAlignment(properties.VerticalAlignment)
        : resolveHorizontalAlignment(properties.HorizontalAlignment),
      'align-content': isHorizontal
        ? resolveVerticalAlignment(properties.VerticalAlignment)
        : resolveHorizontalAlignment(properties.HorizontalAlignment),
    },
    children: children.map(
      (_, index): Styles => ({
        position: 'relative',
        left: 'auto',
        top: 'auto',
        transform: 'none',
        'flex-shrink': '0',
        order: String(displayOrder.get(index) ?? index),
      }),
    ),
  };
}

function compareChildren(
  left: Readonly<{ child: LayoutChild; originalIndex: number }>,
  right: Readonly<{ child: LayoutChild; originalIndex: number }>,
  sortOrder: SortOrder,
): number {
  const comparison =
    sortOrder === 'Name'
      ? left.child.Name.localeCompare(right.child.Name)
      : left.child.LayoutOrder - right.child.LayoutOrder;
  return comparison || left.originalIndex - right.originalIndex;
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

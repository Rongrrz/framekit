import type { InstanceProperties } from '#internal/runtime/node/instance.js';
import {
  createLayoutModifier,
  type LayoutChild,
  type LayoutModifier,
  type LayoutStyles,
  type Styles,
} from '#internal/runtime/node/modifier.js';
import { mergeProperties } from '#internal/runtime/systems/properties.js';
import {
  assertAllowedValue,
  assertInteger,
  assertNonNegativeFinite,
} from '#internal/validation.js';
import { assertUDim2, udim2FromOffset, udimToCss, type UDim2 } from '#values/udim.js';

import {
  resolveChildOrders,
  resolveHorizontalAlignment,
  resolveVerticalAlignment,
} from './layout.js';
import type {
  FillDirection,
  HorizontalAlignment,
  SortOrder,
  VerticalAlignment,
} from './list-layout.js';

/** Properties controlling automatic grid layout. */
export type UIGridLayoutProperties = InstanceProperties & {
  /** Width and height assigned to every grid cell. */
  CellSize: UDim2;
  /** Horizontal and vertical gaps between grid cells. */
  CellPadding: UDim2;
  /** Axis filled before the grid continues on the other axis. */
  FillDirection: FillDirection;
  /** Cells on the fill axis before wrapping, or 0 to derive the count from available space. */
  FillDirectionMaxCells: number;
  /** Horizontal placement of the complete grid within its parent. */
  HorizontalAlignment: HorizontalAlignment;
  /** Vertical placement of the complete grid within its parent. */
  VerticalAlignment: VerticalAlignment;
  /** Property used to sort children before layout. */
  SortOrder: SortOrder;
};

/** An element-less grid layout for direct GUI children. */
export type UIGridLayout = LayoutModifier<UIGridLayoutProperties>;

const fillDirections: readonly FillDirection[] = ['Horizontal', 'Vertical'];
const horizontalAlignments: readonly HorizontalAlignment[] = ['Left', 'Center', 'Right'];
const verticalAlignments: readonly VerticalAlignment[] = ['Top', 'Center', 'Bottom'];
const sortOrders: readonly SortOrder[] = ['LayoutOrder', 'Name'];

/** Creates a grid that gives each direct GUI child the same cell size. */
export function createUIGridLayout(
  initialProperties: Partial<UIGridLayoutProperties> = {},
): UIGridLayout {
  return createLayoutModifier(
    'UIGridLayout',
    mergeProperties(
      {
        Name: 'UIGridLayout',
        CellSize: udim2FromOffset(100, 100),
        CellPadding: udim2FromOffset(0, 0),
        FillDirection: 'Horizontal',
        FillDirectionMaxCells: 0,
        HorizontalAlignment: 'Left',
        VerticalAlignment: 'Top',
        SortOrder: 'LayoutOrder',
      },
      initialProperties,
    ),
    resolveGridLayout,
    validateGridLayoutProperties,
  );
}

function resolveGridLayout(
  properties: Readonly<UIGridLayoutProperties>,
  children: readonly LayoutChild[],
): LayoutStyles {
  const horizontal = properties.FillDirection === 'Horizontal';
  const cellWidth = udimToCss(properties.CellSize.X);
  const cellHeight = udimToCss(properties.CellSize.Y);
  const trackCount = properties.FillDirectionMaxCells || 'auto-fill';
  const sharedParentStyles = {
    display: 'grid',
    gap: `${udimToCss(properties.CellPadding.Y)} ${udimToCss(properties.CellPadding.X)}`,
    'grid-auto-flow': horizontal ? 'row' : 'column',
    'justify-content': resolveHorizontalAlignment(properties.HorizontalAlignment),
    'align-content': resolveVerticalAlignment(properties.VerticalAlignment),
  } satisfies Styles;
  const parent: Styles = horizontal
    ? {
        ...sharedParentStyles,
        'grid-template-columns': `repeat(${trackCount}, ${cellWidth})`,
        'grid-auto-rows': cellHeight,
      }
    : {
        ...sharedParentStyles,
        'grid-template-rows': `repeat(${trackCount}, ${cellHeight})`,
        'grid-auto-columns': cellWidth,
      };

  const childOrders = resolveChildOrders(children, properties.SortOrder);
  return {
    parent,
    children: children.map(
      (_, index): Styles => ({
        position: 'relative',
        left: 'auto',
        top: 'auto',
        transform: 'none',
        width: '100%',
        height: '100%',
        order: String(childOrders[index]),
      }),
    ),
  };
}

function validateGridLayoutProperties(properties: Readonly<UIGridLayoutProperties>): void {
  assertUDim2(properties.CellSize, 'CellSize');
  assertUDim2(properties.CellPadding, 'CellPadding');
  assertAllowedValue(properties.FillDirection, fillDirections, 'FillDirection');
  assertNonNegativeFinite(properties.FillDirectionMaxCells, 'FillDirectionMaxCells');
  assertInteger(properties.FillDirectionMaxCells, 'FillDirectionMaxCells');
  assertAllowedValue(properties.HorizontalAlignment, horizontalAlignments, 'HorizontalAlignment');
  assertAllowedValue(properties.VerticalAlignment, verticalAlignments, 'VerticalAlignment');
  assertAllowedValue(properties.SortOrder, sortOrders, 'SortOrder');
}

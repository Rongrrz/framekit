import type { InstanceProperties } from '#internal/runtime/node/instance.js';
import {
  createLayoutModifier,
  type LayoutModifier,
  type LayoutStyles,
} from '#internal/runtime/node/modifier.js';
import { mergeProperties } from '#internal/runtime/systems/properties.js';
import { assertBoolean } from '#internal/validation.js';
import { assertUDim, udim, udimToCss, type UDim } from '#values/udim.js';

import {
  resolveChildComparison,
  resolveHorizontalAlignment,
  resolveVerticalAlignment,
  validateLayoutProperties,
  type FillDirection,
  type HorizontalAlignment,
  type SortOrder,
  type VerticalAlignment,
} from './layout.js';

export type { FillDirection, HorizontalAlignment, SortOrder, VerticalAlignment } from './layout.js';

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

function resolveListLayout(properties: Readonly<UIListLayoutProperties>): LayoutStyles {
  const isHorizontal = properties.FillDirection === 'Horizontal';
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
    child: {
      position: 'relative',
      left: 'auto',
      top: 'auto',
      transform: 'none',
      'flex-shrink': '0',
    },
    compareChildren: resolveChildComparison(properties.SortOrder),
  };
}

function validateListLayoutProperties(properties: Readonly<UIListLayoutProperties>): void {
  validateLayoutProperties(properties);
  assertBoolean(properties.Wraps, 'Wraps');
  assertUDim(properties.Padding, 'Padding');
}

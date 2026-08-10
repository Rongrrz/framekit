import type { NodeProps } from '../core/node/base';
import type { DecoratorStyles } from '../core/node/variants/decorator';
import {
  layoutNode,
  type LayoutChild,
  type LayoutNode,
  type LayoutStyles,
} from '../core/node/variants/layout';
import { udim, type UDim } from '../primitives/udim';
import { udimToCss } from '../rendering/dom';

export type FillDirection = 'Horizontal' | 'Vertical';
export type HorizontalAlignment = 'Left' | 'Center' | 'Right';
export type VerticalAlignment = 'Top' | 'Center' | 'Bottom';
export type SortOrder = 'LayoutOrder' | 'Name';

export type UIListLayoutProps = NodeProps & {
  FillDirection: FillDirection;
  HorizontalAlignment: HorizontalAlignment;
  VerticalAlignment: VerticalAlignment;
  Padding: UDim;
  SortOrder: SortOrder;
  Wraps: boolean;
};

export type UIListLayoutNode = LayoutNode<UIListLayoutProps>;

export function uiListLayoutNode(initial: Partial<UIListLayoutProps> = {}): UIListLayoutNode {
  return layoutNode(
    'UIListLayout',
    {
      Name: 'UIListLayout',
      FillDirection: 'Vertical',
      HorizontalAlignment: 'Left',
      VerticalAlignment: 'Top',
      Padding: udim(0, 0),
      SortOrder: 'LayoutOrder',
      Wraps: false,
      ...initial,
    },
    layoutList,
  );
}

function layoutList(
  props: Readonly<UIListLayoutProps>,
  children: readonly LayoutChild[],
): LayoutStyles {
  const horizontal = props.FillDirection === 'Horizontal';
  const sorted = children
    .map((child, index) => ({ child, index }))
    .sort((left, right) => compareChildren(left, right, props.SortOrder));
  const orders = new Map(sorted.map(({ index }, order) => [index, order]));

  return {
    parent: {
      display: 'flex',
      'flex-direction': horizontal ? 'row' : 'column',
      'flex-wrap': props.Wraps ? 'wrap' : 'nowrap',
      gap: udimToCss(props.Padding),
      'justify-content': horizontal
        ? horizontalAlignment(props.HorizontalAlignment)
        : verticalAlignment(props.VerticalAlignment),
      'align-items': horizontal
        ? verticalAlignment(props.VerticalAlignment)
        : horizontalAlignment(props.HorizontalAlignment),
    },
    children: children.map(
      (_, index): DecoratorStyles => ({
        position: 'relative',
        left: 'auto',
        top: 'auto',
        transform: 'none',
        'flex-shrink': '0',
        order: String(orders.get(index) ?? index),
      }),
    ),
  };
}

function compareChildren(
  left: Readonly<{ child: LayoutChild; index: number }>,
  right: Readonly<{ child: LayoutChild; index: number }>,
  sortOrder: SortOrder,
): number {
  const comparison =
    sortOrder === 'Name'
      ? left.child.Name.localeCompare(right.child.Name)
      : left.child.LayoutOrder - right.child.LayoutOrder;
  return comparison || left.index - right.index;
}

function horizontalAlignment(alignment: HorizontalAlignment): string {
  if (alignment === 'Center') return 'center';
  if (alignment === 'Right') return 'flex-end';
  return 'flex-start';
}

function verticalAlignment(alignment: VerticalAlignment): string {
  if (alignment === 'Center') return 'center';
  if (alignment === 'Bottom') return 'flex-end';
  return 'flex-start';
}

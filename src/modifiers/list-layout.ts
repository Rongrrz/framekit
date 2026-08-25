import {
  createLayoutModifier,
  type LayoutChild,
  type LayoutNode,
  type LayoutStyles,
  type Styles,
} from '../runtime/render';
import { mergeProps, type NodeProps } from '../runtime/state';
import { udim, udimToCss, type UDim } from '../values/udim';

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

/** Creates a list layout that arranges its parent's direct GUI children. */
export function createUIListLayout(initial: Partial<UIListLayoutProps> = {}): UIListLayoutNode {
  return createLayoutModifier(
    'UIListLayout',
    mergeProps(
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
  props: Readonly<UIListLayoutProps>,
  children: readonly LayoutChild[],
): LayoutStyles {
  const isHorizontal = props.FillDirection === 'Horizontal';
  const orderedChildren = children
    .map((child, originalIndex) => ({ child, originalIndex }))
    .sort((left, right) => compareChildren(left, right, props.SortOrder));
  const displayOrder = new Map(
    orderedChildren.map(({ originalIndex }, order) => [originalIndex, order]),
  );

  return {
    parent: {
      display: 'flex',
      'flex-direction': isHorizontal ? 'row' : 'column',
      'flex-wrap': props.Wraps ? 'wrap' : 'nowrap',
      gap: udimToCss(props.Padding),
      'justify-content': isHorizontal
        ? resolveHorizontalAlignment(props.HorizontalAlignment)
        : resolveVerticalAlignment(props.VerticalAlignment),
      'align-items': isHorizontal
        ? resolveVerticalAlignment(props.VerticalAlignment)
        : resolveHorizontalAlignment(props.HorizontalAlignment),
      'align-content': isHorizontal
        ? resolveVerticalAlignment(props.VerticalAlignment)
        : resolveHorizontalAlignment(props.HorizontalAlignment),
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

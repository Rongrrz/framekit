import type { NodeProps } from '../core/node/base';
import {
  decoratorNode,
  type DecoratorNode,
  type DecoratorStyles,
} from '../core/node/variants/decorator';
import type { FrameProps } from '../gui/frame';
import { udimToCss } from '../rendering/dom';

export type AspectType = 'FitWithinMaxSize' | 'ScaleWithParentSize';
export type DominantAxis = 'Width' | 'Height';

export type UIAspectRatioConstraintProps = NodeProps & {
  AspectRatio: number;
  AspectType: AspectType;
  DominantAxis: DominantAxis;
};

export type UIAspectRatioConstraintNode = DecoratorNode<UIAspectRatioConstraintProps>;

export function uiAspectRatioConstraintNode(
  initial: Partial<UIAspectRatioConstraintProps> = {},
): UIAspectRatioConstraintNode {
  return decoratorNode(
    'UIAspectRatioConstraint',
    {
      Name: 'UIAspectRatioConstraint',
      AspectRatio: 1,
      AspectType: 'FitWithinMaxSize',
      DominantAxis: 'Width',
      ...initial,
    },
    constrainAspectRatio,
  );
}

function constrainAspectRatio(
  props: Readonly<UIAspectRatioConstraintProps>,
  targetProps: Readonly<NodeProps>,
): DecoratorStyles {
  const aspectRatio =
    Number.isFinite(props.AspectRatio) && props.AspectRatio > 0 ? props.AspectRatio : 1;
  const styles: Record<string, string> = {
    'aspect-ratio': `${aspectRatio} / 1`,
  };

  if (props.AspectType === 'ScaleWithParentSize') {
    styles['max-width'] = '100%';
    styles['max-height'] = '100%';
    if (props.DominantAxis === 'Width') {
      styles.width = '100%';
      styles.height = 'auto';
    } else {
      styles.width = 'auto';
      styles.height = '100%';
    }
    return styles;
  }

  if (!hasFrameSize(targetProps)) return styles;
  const width = udimToCss(targetProps.Size.X);
  const height = udimToCss(targetProps.Size.Y);
  styles['max-width'] = width;
  styles['max-height'] = height;
  if (props.DominantAxis === 'Width') {
    styles.width = width;
    styles.height = 'auto';
  } else {
    styles.width = 'auto';
    styles.height = height;
  }
  return styles;
}

function hasFrameSize(props: Readonly<NodeProps>): props is Readonly<FrameProps> {
  return 'Size' in props;
}

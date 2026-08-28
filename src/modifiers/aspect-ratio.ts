import type { FrameProps } from '../elements/frame';
import { createStyleModifier, type StyleModifierNode, type Styles } from '../runtime/modifier';
import { mergeProps, type NodeProps } from '../runtime/state';
import { assertAllowedValue, assertFiniteNumber } from '../runtime/validation';
import { udimToCss } from '../values/udim';

export type AspectType = 'FitWithinMaxSize' | 'ScaleWithParentSize';
export type DominantAxis = 'Width' | 'Height';

export type UIAspectRatioConstraintProps = NodeProps & {
  AspectRatio: number;
  AspectType: AspectType;
  DominantAxis: DominantAxis;
};

export type UIAspectRatioConstraintNode = StyleModifierNode<UIAspectRatioConstraintProps>;

const aspectTypes: readonly AspectType[] = ['FitWithinMaxSize', 'ScaleWithParentSize'];
const dominantAxes: readonly DominantAxis[] = ['Width', 'Height'];

/** Creates a constraint that maintains its GUI parent's width-to-height ratio. */
export function createUIAspectRatioConstraint(
  initial: Partial<UIAspectRatioConstraintProps> = {},
): UIAspectRatioConstraintNode {
  return createStyleModifier(
    'UIAspectRatioConstraint',
    mergeProps(
      {
        Name: 'UIAspectRatioConstraint',
        AspectRatio: 1,
        AspectType: 'FitWithinMaxSize',
        DominantAxis: 'Width',
      },
      initial,
    ),
    resolveAspectRatio,
  );
}

function resolveAspectRatio(
  props: Readonly<UIAspectRatioConstraintProps>,
  parentProps: Readonly<NodeProps>,
): Styles {
  assertAllowedValue(props.AspectType, aspectTypes, 'AspectType');
  assertAllowedValue(props.DominantAxis, dominantAxes, 'DominantAxis');
  assertFiniteNumber(props.AspectRatio, 'AspectRatio');
  const aspectRatio =
    Number.isFinite(props.AspectRatio) && props.AspectRatio > 0 ? props.AspectRatio : 1;
  const styles: Record<string, string> = { 'aspect-ratio': `${aspectRatio} / 1` };

  if (props.AspectType === 'ScaleWithParentSize') {
    return {
      ...styles,
      'max-width': '100%',
      'max-height': '100%',
      width: props.DominantAxis === 'Width' ? '100%' : 'auto',
      height: props.DominantAxis === 'Height' ? '100%' : 'auto',
    };
  }

  if (!hasSize(parentProps)) return styles;
  const width = udimToCss(parentProps.Size.X);
  const height = udimToCss(parentProps.Size.Y);
  return {
    ...styles,
    'max-width': width,
    'max-height': height,
    width: props.DominantAxis === 'Width' ? width : 'auto',
    height: props.DominantAxis === 'Height' ? height : 'auto',
  };
}

function hasSize(props: Readonly<NodeProps>): props is Readonly<FrameProps> {
  return 'Size' in props;
}

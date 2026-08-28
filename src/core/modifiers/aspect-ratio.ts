import {
  createStyleModifier,
  type StyleModifierNode,
  type Styles,
} from '../../shared/runtime/modifier';
import { mergeProperties, type NodeProperties } from '../../shared/runtime/node-state';
import { assertAllowedValue, assertFiniteNumber } from '../../shared/runtime/validation';
import type { GuiObjectProperties } from '../gui-object';
import { udimToCss } from '../values/udim';

/** How an aspect-ratio constraint uses its parent's available size. */
export type AspectType = 'FitWithinMaxSize' | 'ScaleWithParentSize';

/** Axis used to derive the constrained size. */
export type DominantAxis = 'Width' | 'Height';

/** Properties for maintaining a fixed width-to-height ratio. */
export type UIAspectRatioConstraintProperties = NodeProperties & {
  /** Required width divided by height. */
  AspectRatio: number;
  /** How the constraint uses the parent's available size. */
  AspectType: AspectType;
  /** Axis used to derive the other dimension. */
  DominantAxis: DominantAxis;
};

/** An element-less aspect-ratio constraint. */
export type UIAspectRatioConstraintNode = StyleModifierNode<UIAspectRatioConstraintProperties>;

const aspectTypes: readonly AspectType[] = ['FitWithinMaxSize', 'ScaleWithParentSize'];
const dominantAxes: readonly DominantAxis[] = ['Width', 'Height'];

/** Creates a constraint that maintains its GUI parent's width-to-height ratio. */
export function createUIAspectRatioConstraint(
  initial: Partial<UIAspectRatioConstraintProperties> = {},
): UIAspectRatioConstraintNode {
  return createStyleModifier(
    'UIAspectRatioConstraint',
    mergeProperties(
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
  properties: Readonly<UIAspectRatioConstraintProperties>,
  parentProperties: Readonly<NodeProperties>,
): Styles {
  assertAllowedValue(properties.AspectType, aspectTypes, 'AspectType');
  assertAllowedValue(properties.DominantAxis, dominantAxes, 'DominantAxis');
  assertFiniteNumber(properties.AspectRatio, 'AspectRatio');
  const aspectRatio =
    Number.isFinite(properties.AspectRatio) && properties.AspectRatio > 0
      ? properties.AspectRatio
      : 1;
  const styles: Record<string, string> = { 'aspect-ratio': `${aspectRatio} / 1` };

  if (properties.AspectType === 'ScaleWithParentSize') {
    return {
      ...styles,
      'max-width': '100%',
      'max-height': '100%',
      width: properties.DominantAxis === 'Width' ? '100%' : 'auto',
      height: properties.DominantAxis === 'Height' ? '100%' : 'auto',
    };
  }

  if (!hasSize(parentProperties)) return styles;
  const width = udimToCss(parentProperties.Size.X);
  const height = udimToCss(parentProperties.Size.Y);
  return {
    ...styles,
    'max-width': width,
    'max-height': height,
    width: properties.DominantAxis === 'Width' ? width : 'auto',
    height: properties.DominantAxis === 'Height' ? height : 'auto',
  };
}

function hasSize(
  properties: Readonly<NodeProperties>,
): properties is Readonly<GuiObjectProperties> {
  return 'Size' in properties;
}

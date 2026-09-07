import { createStyleModifier, type StyleModifier, type Styles } from '../../runtime/modifier';
import type { InstanceProperties } from '../../runtime/node';
import { mergeProperties } from '../../runtime/node-properties';
import { assertAllowedValue, assertFiniteNumber } from '../../runtime/validation';
import { udimToCss, type UDim2 } from '../values/udim';

/** How an aspect-ratio constraint uses its parent's available size. */
export type AspectType = 'FitWithinMaxSize' | 'ScaleWithParentSize';

/** Axis used to derive the constrained size. */
export type DominantAxis = 'Width' | 'Height';

/** Properties for maintaining a fixed width-to-height ratio. */
export type UIAspectRatioConstraintProperties = InstanceProperties & {
  /** Required width divided by height. */
  AspectRatio: number;
  /** How the constraint uses the parent's available size. */
  AspectType: AspectType;
  /** Axis used to derive the other dimension. */
  DominantAxis: DominantAxis;
};

/** An element-less aspect-ratio constraint. */
export type UIAspectRatioConstraint = StyleModifier<UIAspectRatioConstraintProperties>;

const aspectTypes: readonly AspectType[] = ['FitWithinMaxSize', 'ScaleWithParentSize'];
const dominantAxes: readonly DominantAxis[] = ['Width', 'Height'];

/** Creates a constraint that maintains its GUI parent's width-to-height ratio. */
export function createUIAspectRatioConstraint(
  initialProperties: Partial<UIAspectRatioConstraintProperties> = {},
): UIAspectRatioConstraint {
  return createStyleModifier(
    'UIAspectRatioConstraint',
    mergeProperties(
      {
        Name: 'UIAspectRatioConstraint',
        AspectRatio: 1,
        AspectType: 'FitWithinMaxSize',
        DominantAxis: 'Width',
      },
      initialProperties,
    ),
    resolveAspectRatio,
    validateAspectRatioProperties,
  );
}

function resolveAspectRatio(
  properties: Readonly<UIAspectRatioConstraintProperties>,
  parentProperties: Readonly<InstanceProperties>,
): Styles {
  const aspectRatio = properties.AspectRatio > 0 ? properties.AspectRatio : 1;
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

function validateAspectRatioProperties(
  properties: Readonly<UIAspectRatioConstraintProperties>,
): void {
  assertAllowedValue(properties.AspectType, aspectTypes, 'AspectType');
  assertAllowedValue(properties.DominantAxis, dominantAxes, 'DominantAxis');
  assertFiniteNumber(properties.AspectRatio, 'AspectRatio');
}

function hasSize(
  properties: Readonly<InstanceProperties>,
): properties is Readonly<InstanceProperties & { Size: UDim2 }> {
  return 'Size' in properties;
}

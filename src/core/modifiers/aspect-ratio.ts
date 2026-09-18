import type { GuiObjectProperties } from '../gui-object';
import { assertAllowedValue, assertPositiveFinite } from '../internal/validation';
import type { InstanceProperties } from '../node/instance';
import {
  createStyleModifier,
  type ModifierTarget,
  type StyleModifier,
  type Styles,
} from '../node/modifier';
import { mergeProperties } from '../node/properties';
import { udimToCss } from '../values/udim';

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
  target: ModifierTarget,
): Styles {
  const styles: Record<string, string> = { 'aspect-ratio': `${properties.AspectRatio} / 1` };

  if (properties.AspectType === 'ScaleWithParentSize') {
    return {
      ...styles,
      'max-width': '100%',
      'max-height': '100%',
      width: properties.DominantAxis === 'Width' ? '100%' : 'auto',
      height: properties.DominantAxis === 'Height' ? '100%' : 'auto',
    };
  }

  if (!target.capabilities.guiObject) return styles;
  const targetProperties = target.properties as Readonly<GuiObjectProperties>;
  const width = udimToCss(targetProperties.Size.X);
  const height = udimToCss(targetProperties.Size.Y);
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
  assertPositiveFinite(properties.AspectRatio, 'AspectRatio');
}

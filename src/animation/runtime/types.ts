import type { InstanceProperties } from '#runtime/node/instance.js';
import type { Color3 } from '#values/color3.js';
import type { UDim, UDim2 } from '#values/udim.js';
import type { Vector2 } from '#values/vector2.js';

type AnimatableValue = number | Color3 | Vector2 | UDim | UDim2;
const discreteProperties = ['LayoutOrder', 'ZIndex'] as const;
type DiscreteProperty = (typeof discreteProperties)[number];

/** Mirrors the discrete-property exclusion at the JavaScript caller boundary. */
export function isDiscreteAnimationProperty(property: PropertyKey): boolean {
  return discreteProperties.some((discreteProperty) => discreteProperty === property);
}

/** Property names whose values can be interpolated continuously. */
export type AnimatableProperty<Properties extends InstanceProperties> = {
  [Property in keyof Properties]: Property extends DiscreteProperty
    ? never
    : Properties[Property] extends AnimatableValue
      ? Property
      : never;
}[keyof Properties];

/** A partial property patch containing only values supported by springs and tweens. */
export type AnimationGoal<Properties extends InstanceProperties> = Partial<
  Pick<Properties, AnimatableProperty<Properties>>
>;

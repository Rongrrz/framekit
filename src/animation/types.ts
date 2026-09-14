import type { InstanceProperties } from '../core/node/instance';
import type { Color3 } from '../core/values/color3';
import type { UDim, UDim2 } from '../core/values/udim';
import type { Vector2 } from '../core/values/vector2';

type AnimatableValue = number | Color3 | Vector2 | UDim | UDim2;
type DiscreteProperty = 'LayoutOrder' | 'ZIndex';

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

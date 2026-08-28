import type { NodeProperties } from '../runtime/node-state';
import type { Color3 } from '../values/color3';
import type { UDim, UDim2 } from '../values/udim';
import type { Vector2 } from '../values/vector2';

type AnimatableValue = number | Color3 | Vector2 | UDim | UDim2;

/** A partial property patch containing only values supported by springs and tweens. */
export type AnimationGoal<Properties extends NodeProperties> = {
  [Property in keyof Properties]?: Properties[Property] extends AnimatableValue
    ? Properties[Property]
    : never;
};

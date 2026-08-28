import type { Color3 } from '../core/values/color3';
import type { UDim, UDim2 } from '../core/values/udim';
import type { Vector2 } from '../core/values/vector2';
import type { NodeProperties } from '../shared/runtime/node-state';

type AnimatableValue = number | Color3 | Vector2 | UDim | UDim2;

/** A partial property patch containing only values supported by springs and tweens. */
export type AnimationGoal<Properties extends NodeProperties> = {
  [Property in keyof Properties]?: Properties[Property] extends AnimatableValue
    ? Properties[Property]
    : never;
};

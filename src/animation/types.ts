import type { NodeProps } from '../runtime/state';
import type { Color3 } from '../values/color3';
import type { UDim, UDim2 } from '../values/udim';
import type { Vector2 } from '../values/vector2';

type AnimatableValue = number | Color3 | Vector2 | UDim | UDim2;

export type AnimationGoal<Props extends NodeProps> = {
  [Key in keyof Props as Props[Key] extends AnimatableValue ? Key : never]?: Props[Key];
};

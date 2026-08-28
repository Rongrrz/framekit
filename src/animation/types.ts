import type { NodeProps } from '../runtime/state';
import type { Color3 } from '../values/color3';
import type { UDim, UDim2 } from '../values/udim';
import type { Vector2 } from '../values/vector2';

type AnimatableValue = number | Color3 | Vector2 | UDim | UDim2;

type AnimatableProperty<Props extends NodeProps> = {
  [Key in keyof Props]: Props[Key] extends AnimatableValue ? Key : never;
}[keyof Props];

/** A partial property patch containing only values supported by springs and tweens. */
export type AnimationGoal<Props extends NodeProps> = Partial<
  Pick<Props, AnimatableProperty<Props>>
>;

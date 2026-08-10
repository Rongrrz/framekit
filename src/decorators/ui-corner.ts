import type { NodeProps } from '../core/node/base';
import {
  decoratorNode,
  type DecoratorNode,
  type DecoratorStyles,
} from '../core/node/variants/decorator';

export type UICornerProps = NodeProps & {
  Enabled: boolean;
  CornerRadius: number;
};

export type UICornerNode = DecoratorNode<UICornerProps>;

export function uiCornerNode(initial: Partial<UICornerProps> = {}): UICornerNode {
  return decoratorNode(
    'UICorner',
    { Name: 'UICorner', Enabled: true, CornerRadius: 0, ...initial },
    (props): DecoratorStyles =>
      props.Enabled ? { 'border-radius': `${Math.max(0, props.CornerRadius)}px` } : {},
  );
}

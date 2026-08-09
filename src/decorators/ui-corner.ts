import { decoratorNode, type DecoratorStyles, type Node, type NodeProps } from '../core/node';

export type UICornerProps = NodeProps & {
  Enabled: boolean;
  CornerRadius: number;
};

export type UICornerNode = Node<UICornerProps>;

export function uiCornerNode(initial: Partial<UICornerProps> = {}): UICornerNode {
  return decoratorNode(
    { Name: 'UICorner', Enabled: true, CornerRadius: 0, ...initial },
    (props): DecoratorStyles =>
      props.Enabled ? { 'border-radius': `${Math.max(0, props.CornerRadius)}px` } : {},
  );
}

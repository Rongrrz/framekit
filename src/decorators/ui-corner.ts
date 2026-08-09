import { node, type Node, type NodeProps, type Styles } from '../core/node';

export type UICornerProps = NodeProps & {
  Enabled: boolean;
  CornerRadius: number;
};

export type UICornerNode = Node<UICornerProps>;

export function uiCornerNode(initial: Partial<UICornerProps> = {}): UICornerNode {
  return node(
    { Name: 'UICorner', Enabled: true, CornerRadius: 0, ...initial },
    undefined,
    undefined,
    (props): Styles =>
      props.Enabled ? { 'border-radius': `${Math.max(0, props.CornerRadius)}px` } : {},
  );
}

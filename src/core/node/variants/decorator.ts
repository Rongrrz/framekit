import { baseState, type BaseNodeState, type Node, type NodeProps } from '../base';
import { registerNode } from '../state';

declare const decoratorBrand: unique symbol;

/** An element-less node that decorates its GUI parent. */
export type DecoratorNode<Props extends NodeProps = NodeProps> = Node<Props> & {
  readonly [decoratorBrand]: true;
};

export type DecoratorStyles = Readonly<Record<string, string>>;

export type Decorator<Props extends NodeProps> = (
  props: Readonly<Props>,
  targetProps: Readonly<NodeProps>,
) => DecoratorStyles;

export type DecoratorNodeState<Props extends NodeProps = NodeProps> = BaseNodeState<Props> & {
  kind: 'decorator';
  modifierType: string;
  decorate: Decorator<Props>;
};

/** Creates an element-less appearance modifier. */
export function decoratorNode<Props extends NodeProps>(
  modifierType: string,
  props: Props,
  decorate: Decorator<Props>,
): DecoratorNode<Props> {
  const handle = Object.freeze({}) as DecoratorNode<Props>;
  registerNode(handle, { ...baseState(props), kind: 'decorator', modifierType, decorate });
  return handle;
}

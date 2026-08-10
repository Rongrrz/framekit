import type { BaseNodeState, Node, NodeProps } from './base';
import type { DecoratorNodeState } from './variants/decorator';
import type { GuiNodeState } from './variants/gui';
import type { LayoutNodeState } from './variants/layout';

/** Internal tree-only state used by lightweight test nodes. */
export type GroupNodeState<Props extends NodeProps = NodeProps> = BaseNodeState<Props> & {
  kind: 'group';
  children: Node[];
};

export type NodeState<Props extends NodeProps = NodeProps> =
  | GroupNodeState<Props>
  | GuiNodeState<Props>
  | DecoratorNodeState<Props>
  | LayoutNodeState<Props>;

const states = new WeakMap<Node, NodeState<any>>();

export function registerNode<Props extends NodeProps>(
  handle: Node<Props>,
  state: NodeState<Props>,
): void {
  states.set(handle, state);
}

/** Internal state access for FrameKit's node modules. */
export function nodeState<Props extends NodeProps>(handle: Node<Props>): NodeState<Props> {
  const state = states.get(handle);
  if (!state) throw new TypeError('Expected a FrameKit node.');
  return state;
}

/** Returns the mutable child collection for tree-capable nodes. */
export function childNodes<Props extends NodeProps>(state: NodeState<Props>): Node[] {
  return state.kind === 'group' || state.kind === 'gui' ? state.children : [];
}

/** Returns whether a state describes a decorator or layout modifier. */
export function isModifierState<Props extends NodeProps>(
  state: NodeState<Props>,
): state is DecoratorNodeState<Props> | LayoutNodeState<Props> {
  return state.kind === 'decorator' || state.kind === 'layout';
}

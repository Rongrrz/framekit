import type { GuiNodeState, LayoutNodeState, StyleModifierState } from './render';

export type NodeProps = {
  Name: string;
};

declare const nodeProps: unique symbol;

/** An opaque handle to an item managed by FrameKit. */
export type Node<Props extends NodeProps = NodeProps> = {
  readonly [nodeProps]: Props;
};

export type BaseNodeState<Props extends NodeProps = NodeProps> = {
  props: Props;
  parent: Node | undefined;
  destroyed: boolean;
  cleanups: Set<() => void>;
};

/** Internal tree-only state used by lightweight test nodes. */
export type GroupNodeState<Props extends NodeProps = NodeProps> = BaseNodeState<Props> & {
  kind: 'group';
  children: Node[];
};

export type NodeState<Props extends NodeProps = NodeProps> =
  | GroupNodeState<Props>
  | GuiNodeState<Props>
  | StyleModifierState<Props>
  | LayoutNodeState<Props>;

const states = new WeakMap<Node, NodeState>();

export function createBaseState<Props extends NodeProps>(props: Props): BaseNodeState<Props> {
  return { props, parent: undefined, destroyed: false, cleanups: new Set() };
}

/** Merges constructor properties while rejecting misspelled or unsupported keys. */
export function mergeProps<Props extends NodeProps>(
  defaults: Props,
  initial: Partial<Props>,
): Props {
  for (const property of Object.keys(initial)) {
    if (!Object.hasOwn(defaults, property)) {
      throw new TypeError(`Unknown property "${property}" on ${defaults.Name}.`);
    }
  }
  return { ...defaults, ...initial };
}

export function registerNode<Props extends NodeProps>(
  node: Node<Props>,
  state: NodeState<Props>,
): void {
  states.set(node, state as NodeState);
}

/** Returns the private state behind a public node handle. */
export function getNodeState<Props extends NodeProps>(node: Node<Props>): NodeState<Props> {
  const state = states.get(node);
  if (!state) throw new TypeError('Expected a FrameKit node.');
  return state as NodeState<Props>;
}

export function getChildren<Props extends NodeProps>(state: NodeState<Props>): Node[] {
  return state.kind === 'group' || state.kind === 'gui' ? state.children : [];
}

export function isModifierState<Props extends NodeProps>(
  state: NodeState<Props>,
): state is StyleModifierState<Props> | LayoutNodeState<Props> {
  return state.kind === 'style' || state.kind === 'layout';
}

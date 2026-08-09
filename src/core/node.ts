export type NodeProps = {
  Name: string;
};

declare const nodeProps: unique symbol;

/** An opaque handle to an item managed by FrameKit. */
export type Node<Props extends NodeProps = NodeProps> = {
  readonly element?: HTMLElement;
  readonly [nodeProps]: Props;
};

export type GuiNode<Props extends NodeProps = NodeProps> = Node<Props> & {
  readonly element: HTMLElement;
};

export type Render<Props extends NodeProps> = (
  props: Readonly<Props>,
  changed: ReadonlySet<keyof Props>,
) => void;

/** Internal mutable state associated with an opaque node handle. */
export type NodeState<Props extends NodeProps = NodeProps> = {
  props: Props;
  parent?: Node;
  children: Node[];
  destroyed: boolean;
  render?: Render<Props>;
  cleanups: Set<() => void>;
};

const states = new WeakMap<Node, NodeState<any>>();

/** Internal building block used by FrameKit factories. */
export function node<Props extends NodeProps>(
  props: Props,
  element?: HTMLElement,
  render?: Render<Props>,
): Node<Props> {
  const handle = Object.freeze({ element }) as Node<Props>;
  states.set(handle, {
    props,
    children: [],
    destroyed: false,
    render,
    cleanups: new Set(),
  });
  render?.(props, new Set(Object.keys(props) as (keyof Props)[]));
  return handle;
}

export function update<Props extends NodeProps>(handle: Node<Props>, patch: Partial<Props>): void {
  assertNodeActive(handle);
  const state = nodeState(handle);
  const changed = new Set(Object.keys(patch) as (keyof Props)[]);
  if (changed.size === 0) return;
  state.props = { ...state.props, ...patch };
  state.render?.(state.props, changed);
}

export function props<Props extends NodeProps>(handle: Node<Props>): Readonly<Props> {
  assertNodeActive(handle);
  return { ...nodeState(handle).props };
}

export function destroy(handle: Node): void {
  const state = nodeState(handle);
  if (state.destroyed) return;
  for (const child of Array.from(state.children)) destroy(child);
  if (state.parent) {
    const siblings = nodeState(state.parent).children;
    siblings.splice(siblings.indexOf(handle), 1);
    state.parent = undefined;
  }
  state.destroyed = true;
  for (const callback of state.cleanups) callback();
  state.cleanups.clear();
  handle.element?.remove();
}

export function isDestroyed(handle: Node): boolean {
  return nodeState(handle).destroyed;
}

/** Registers resource cleanup with a node's lifecycle. */
export function cleanup(handle: Node, callback: () => void): void {
  assertNodeActive(handle);
  nodeState(handle).cleanups.add(callback);
}

/** Internal state access for the tree and event modules. */
export function nodeState<Props extends NodeProps>(handle: Node<Props>): NodeState<Props> {
  const state = states.get(handle);
  if (!state) throw new TypeError('Expected a FrameKit node.');
  return state;
}

/** Throws when a node can no longer be used. */
export function assertNodeActive(handle: Node): void {
  const state = nodeState(handle);
  if (state.destroyed) throw new Error(`${state.props.Name} has been destroyed.`);
}

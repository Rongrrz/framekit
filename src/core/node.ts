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

export type DecoratorStyles = Readonly<Record<string, string>>;

export type Decorator<Props extends NodeProps> = (props: Readonly<Props>) => DecoratorStyles;

/** Internal mutable state associated with an opaque node handle. */
export type NodeState<Props extends NodeProps = NodeProps> = {
  props: Props;
  parent: Node | undefined;
  children: Node[];
  destroyed: boolean;
  render: Render<Props> | undefined;
  decorate: Decorator<Props> | undefined;
  cleanups: Set<() => void>;
  appliedStyles: Set<string>;
};

const states = new WeakMap<Node, NodeState<any>>();

/** Internal building block used by FrameKit factories. */
export function node<Props extends NodeProps>(
  props: Props,
  element: HTMLElement,
  render?: Render<Props>,
  decorate?: Decorator<Props>,
): GuiNode<Props>;
export function node<Props extends NodeProps>(
  props: Props,
  element?: undefined,
  render?: Render<Props>,
  decorate?: Decorator<Props>,
): Node<Props>;
export function node<Props extends NodeProps>(
  props: Props,
  element?: HTMLElement,
  render?: Render<Props>,
  decorate?: Decorator<Props>,
): Node<Props> {
  const handle = Object.freeze({ element }) as Node<Props>;
  states.set(handle, {
    props,
    parent: undefined,
    children: [],
    destroyed: false,
    render,
    decorate,
    cleanups: new Set(),
    appliedStyles: new Set(),
  });
  renderNode(handle, new Set(Object.keys(props) as (keyof Props)[]));
  return handle;
}

/** Creates an element-less node that contributes styles to its parent. */
export function decoratorNode<Props extends NodeProps>(
  props: Props,
  decorate: Decorator<Props>,
): Node<Props> {
  return node(props, undefined, undefined, decorate);
}

/** Applies a partial property update and synchronizes the affected rendering. */
export function update<Props extends NodeProps>(handle: Node<Props>, patch: Partial<Props>): void {
  assertNodeActive(handle);
  const state = nodeState(handle);
  const changed = new Set(Object.keys(patch) as (keyof Props)[]);
  if (changed.size === 0) return;
  state.props = { ...state.props, ...patch };
  if (state.decorate) {
    if (state.parent) renderNode(state.parent);
  } else {
    renderNode(handle, changed);
  }
}

/** Returns a readonly snapshot of a node's current properties. */
export function props<Props extends NodeProps>(handle: Node<Props>): Readonly<Props> {
  assertNodeActive(handle);
  return { ...nodeState(handle).props };
}

/** Recursively destroys a node, its descendants, DOM, and lifecycle resources. */
export function destroy(handle: Node): void {
  const state = nodeState(handle);
  if (state.destroyed) return;
  for (const child of Array.from(state.children)) destroy(child);
  if (state.parent) {
    const previous = state.parent;
    const siblings = nodeState(state.parent).children;
    const index = siblings.indexOf(handle);
    if (index >= 0) siblings.splice(index, 1);
    state.parent = undefined;
    if (state.decorate) renderNode(previous);
  }
  state.destroyed = true;
  for (const callback of state.cleanups) callback();
  state.cleanups.clear();
  handle.element?.remove();
}

/** Reports whether a node has been destroyed. */
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

/** Renders a node's base styles followed by its decorator children. */
export function renderNode<Props extends NodeProps>(
  handle: Node<Props>,
  changed: ReadonlySet<keyof Props> = new Set(),
): void {
  const state = nodeState(handle);
  const { element } = handle;
  if (element) {
    for (const property of state.appliedStyles) element.style.removeProperty(property);
    state.appliedStyles.clear();
  }

  state.render?.(state.props, changed);
  if (!element) return;

  for (const child of state.children) {
    const childState = nodeState(child);
    if (!childState.decorate) continue;
    for (const [property, value] of Object.entries(childState.decorate(childState.props))) {
      element.style.setProperty(property, value);
      state.appliedStyles.add(property);
    }
  }
}

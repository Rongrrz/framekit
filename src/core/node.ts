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

/** The layout-relevant properties exposed for each direct GUI child. */
export type LayoutChild = Readonly<{
  Name: string;
  LayoutOrder: number;
}>;

/** Styles a layout contributes to its parent and each direct GUI child. */
export type LayoutStyles = Readonly<{
  parent: DecoratorStyles;
  children: readonly DecoratorStyles[];
}>;

export type Layout<Props extends NodeProps> = (
  props: Readonly<Props>,
  children: readonly LayoutChild[],
) => LayoutStyles;

/** Internal mutable state associated with an opaque node handle. */
export type NodeState<Props extends NodeProps = NodeProps> = {
  props: Props;
  parent: Node | undefined;
  children: Node[];
  destroyed: boolean;
  render: Render<Props> | undefined;
  decorate: Decorator<Props> | undefined;
  layout: Layout<Props> | undefined;
  cleanups: Set<() => void>;
  appliedStyles: Set<string>;
  appliedChildStyles: Map<Node, Set<string>>;
};

const states = new WeakMap<Node, NodeState<any>>();

/** Internal building block used by FrameKit factories. */
export function node<Props extends NodeProps>(
  props: Props,
  element: HTMLElement,
  render?: Render<Props>,
  decorate?: Decorator<Props>,
  layout?: Layout<Props>,
): GuiNode<Props>;
export function node<Props extends NodeProps>(
  props: Props,
  element?: undefined,
  render?: Render<Props>,
  decorate?: Decorator<Props>,
  layout?: Layout<Props>,
): Node<Props>;
export function node<Props extends NodeProps>(
  props: Props,
  element?: HTMLElement,
  render?: Render<Props>,
  decorate?: Decorator<Props>,
  layout?: Layout<Props>,
): Node<Props> {
  const handle = Object.freeze({ element }) as Node<Props>;
  states.set(handle, {
    props,
    parent: undefined,
    children: [],
    destroyed: false,
    render,
    decorate,
    layout,
    cleanups: new Set(),
    appliedStyles: new Set(),
    appliedChildStyles: new Map(),
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

/** Creates an element-less node that controls its parent's direct GUI children. */
export function layoutNode<Props extends NodeProps>(
  props: Props,
  layout: Layout<Props>,
): Node<Props> {
  return node(props, undefined, undefined, undefined, layout);
}

/** Applies a partial property update and synchronizes the affected rendering. */
export function update<Props extends NodeProps>(handle: Node<Props>, patch: Partial<Props>): void {
  assertNodeActive(handle);
  const state = nodeState(handle);
  const changed = new Set(Object.keys(patch) as (keyof Props)[]);
  if (changed.size === 0) return;
  state.props = { ...state.props, ...patch };
  if (state.decorate || state.layout) {
    if (state.parent) renderNode(state.parent);
  } else {
    renderNode(handle, changed);
    if (state.parent && hasLayout(state.parent)) renderNode(state.parent);
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
    if (state.decorate || state.layout || hasLayout(previous)) renderNode(previous);
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

/** Returns whether a node currently contains a layout decorator. */
export function hasLayout(handle: Node): boolean {
  return nodeState(handle).children.some((child) => Boolean(nodeState(child).layout));
}

/** Renders a node's base styles followed by its decorator children. */
export function renderNode<Props extends NodeProps>(
  handle: Node<Props>,
  changed: ReadonlySet<keyof Props> = new Set(),
): void {
  const state = nodeState(handle);
  const { element } = handle;
  for (const [child, properties] of state.appliedChildStyles) {
    if (nodeState(child).destroyed) continue;
    for (const property of properties) child.element?.style.removeProperty(property);
    renderNode(child);
  }
  state.appliedChildStyles.clear();

  if (element) {
    for (const property of state.appliedStyles) element.style.removeProperty(property);
    state.appliedStyles.clear();
  }

  state.render?.(state.props, changed);
  if (!element) return;

  const preserveHiddenDisplay = element.style.display === 'none';

  for (const child of state.children) {
    const childState = nodeState(child);
    if (childState.decorate) {
      applyStyles(element, childState.decorate(childState.props), state, preserveHiddenDisplay);
    }
    if (childState.layout) {
      applyLayout(handle, childState, preserveHiddenDisplay);
    }
  }
}

function applyLayout(parent: Node, layoutState: NodeState, preserveHiddenDisplay: boolean): void {
  const parentState = nodeState(parent);
  const parentElement = parent.element;
  if (!parentElement) return;
  const guiChildren = parentState.children.filter((child) => Boolean(child.element));
  const childProps = guiChildren.map((child): LayoutChild => {
    const props = nodeState(child).props as NodeProps & { LayoutOrder?: unknown };
    return {
      Name: props.Name,
      LayoutOrder: typeof props.LayoutOrder === 'number' ? props.LayoutOrder : 0,
    };
  });
  const styles = layoutState.layout?.(layoutState.props, childProps);
  if (!styles) return;
  applyStyles(parentElement, styles.parent, parentState, preserveHiddenDisplay);
  for (const [index, child] of guiChildren.entries()) {
    const childStyles = styles.children[index];
    if (!childStyles) continue;
    const appliedProperties = parentState.appliedChildStyles.get(child) ?? new Set<string>();
    for (const [property, value] of Object.entries(childStyles)) {
      child.element?.style.setProperty(property, value);
      appliedProperties.add(property);
    }
    parentState.appliedChildStyles.set(child, appliedProperties);
  }
}

function applyStyles(
  element: HTMLElement,
  styles: DecoratorStyles,
  state: Pick<NodeState, 'appliedStyles'>,
  preserveHiddenDisplay: boolean,
): void {
  for (const [property, value] of Object.entries(styles)) {
    if (property === 'display' && preserveHiddenDisplay) continue;
    element.style.setProperty(property, value);
    state.appliedStyles.add(property);
  }
}

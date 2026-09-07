import type { GuiElement, PropertyRenderer } from './gui-node';
import type { LayoutNodeState, Modifier, StyleModifierState } from './modifier';
import type { Instance, InstanceProperties } from './node';

export type PropertyValidator<Properties extends InstanceProperties> = (
  properties: Readonly<Properties>,
) => void;

export type BaseNodeState<Properties extends InstanceProperties = InstanceProperties> = {
  className: string;
  properties: Properties;
  validateProperties: PropertyValidator<Properties> | undefined;
  canHaveParent: boolean;
  parent: Instance | undefined;
  destroyed: boolean;
  cleanups: Set<() => void>;
};

export type NodeState<Properties extends InstanceProperties = InstanceProperties> =
  | GuiNodeState<Properties>
  | StyleModifierState<Properties>
  | LayoutNodeState<Properties>;

export type GuiNodeState<Properties extends InstanceProperties = InstanceProperties> =
  BaseNodeState<Properties> & {
    kind: 'gui';
    children: Instance[];
    propertyNames: ReadonlySet<keyof Properties>;
    renderProperties: PropertyRenderer<Properties> | undefined;
    modifiers: Map<string, Modifier>;
    appliedModifierStyles: Set<string>;
    appliedLayoutStylesByChild: Map<GuiElement, Set<string>>;
  };

// Handles expose the API; this registry owns their mutable properties, hierarchy, and resources.
const states = new WeakMap<Instance, NodeState>();

export function createBaseState<Properties extends InstanceProperties>(
  className: string,
  properties: Properties,
  validateProperties?: PropertyValidator<Properties>,
  canHaveParent = true,
): BaseNodeState<Properties> {
  validateProperties?.(properties);
  return {
    className,
    properties,
    validateProperties,
    canHaveParent,
    parent: undefined,
    destroyed: false,
    cleanups: new Set(),
  };
}

export function registerNode<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  state: NodeState<Properties>,
): void {
  states.set(node, state as NodeState);
}

/** Returns the private state behind a public node handle. */
export function getNodeState<Properties extends InstanceProperties>(
  node: Instance<Properties>,
): NodeState<Properties> {
  const state = states.get(node);
  if (!state) throw new TypeError('Expected a FrameKit node.');
  return state as NodeState<Properties>;
}

/** Returns the authoritative state for a node whose lifecycle is still active. */
export function getActiveNodeState<Properties extends InstanceProperties>(
  node: Instance<Properties>,
): NodeState<Properties> {
  const state = getNodeState(node);
  if (state.destroyed) throw new Error(`${state.properties.Name} has been destroyed.`);
  return state;
}

export function getChildren<Properties extends InstanceProperties>(
  state: NodeState<Properties>,
): Instance[] {
  return state.kind === 'gui' ? state.children : [];
}

export function isModifierState<Properties extends InstanceProperties>(
  state: NodeState<Properties>,
): state is StyleModifierState<Properties> | LayoutNodeState<Properties> {
  return state.kind === 'style' || state.kind === 'layout';
}

export function isGuiNode(node: Instance): node is GuiElement {
  return getNodeState(node).kind === 'gui';
}

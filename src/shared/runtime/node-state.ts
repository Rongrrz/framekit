import type { LayoutNodeState, Modifier, StyleModifierState } from './modifier';
import type { Instance, InstanceProperties } from './node';
import type { GuiNodeState } from './render';
import { assertString } from './validation';

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

/** Internal tree-only state used by lightweight test nodes. */
export type GroupNodeState<Properties extends InstanceProperties = InstanceProperties> =
  BaseNodeState<Properties> & {
    kind: 'group';
    children: Instance[];
  };

export type NodeState<Properties extends InstanceProperties = InstanceProperties> =
  | GroupNodeState<Properties>
  | GuiNodeState<Properties>
  | StyleModifierState<Properties>
  | LayoutNodeState<Properties>;

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

/** Merges constructor properties while rejecting misspelled or unsupported keys. */
export function mergeProperties<Properties extends InstanceProperties>(
  defaultProperties: Properties,
  initial: Partial<Properties>,
): Properties {
  validatePropertyPatch(defaultProperties, initial);
  return { ...defaultProperties, ...initial };
}

/** Rejects unknown, missing, and non-finite property values. */
export function validatePropertyPatch<Properties extends InstanceProperties>(
  current: Readonly<Properties>,
  patch: Partial<Properties>,
): void {
  for (const property of Object.keys(patch) as (keyof Properties)[]) {
    if (!Object.hasOwn(current, property)) {
      throw new TypeError(`Unknown property "${String(property)}" on ${current.Name}.`);
    }

    const received = patch[property];
    if (received === undefined || received === null) {
      throw new TypeError(`Property "${String(property)}" on ${current.Name} is required.`);
    }
    if (typeof received === 'number' && !Number.isFinite(received)) {
      throw new TypeError(`Property "${String(property)}" on ${current.Name} must be finite.`);
    }
    if (property === 'Name') assertString(received, 'Name');
  }
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
  return state.kind === 'group' || state.kind === 'gui' ? state.children : [];
}

/** Links a child into the authoritative hierarchy state. DOM placement remains the tree's job. */
export function linkNodeToParent(
  parent: Instance,
  parentState: NodeState,
  child: Instance,
  childState: NodeState,
  index = getChildren(parentState).length,
): number {
  childState.parent = parent;
  const siblings = getChildren(parentState);
  const insertionIndex = Math.max(0, Math.min(index, siblings.length));
  if (insertionIndex === siblings.length) siblings.push(child);
  else siblings.splice(insertionIndex, 0, child);
  if (isModifierState(childState) && parentState.kind === 'gui') {
    parentState.modifiers.set(childState.modifierKey, child as Modifier);
  }
  return insertionIndex;
}

/** Removes a node from the authoritative hierarchy state and returns its previous parent. */
export function unlinkNodeFromParent(node: Instance, state: NodeState): Instance | undefined {
  const previousParent = state.parent;
  if (!previousParent) return undefined;

  const parentState = getNodeState(previousParent);
  const siblings = getChildren(parentState);
  const index = siblings.indexOf(node);
  if (index >= 0) siblings.splice(index, 1);
  if (isModifierState(state) && parentState.kind === 'gui') {
    parentState.modifiers.delete(state.modifierKey);
  }
  state.parent = undefined;
  return previousParent;
}

export function isModifierState<Properties extends InstanceProperties>(
  state: NodeState<Properties>,
): state is StyleModifierState<Properties> | LayoutNodeState<Properties> {
  return state.kind === 'style' || state.kind === 'layout';
}

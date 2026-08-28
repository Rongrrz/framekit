import type { LayoutNodeState, StyleModifierState } from './modifier';
import type { NodeMethods } from './node-methods';
import type { GuiNodeState } from './render';
import { assertString } from './validation';

/** Properties shared by every FrameKit node. */
export type NodeProperties = {
  /** The editable hierarchy name used by lookup and debug paths. */
  Name: string;
};

declare const nodeProperties: unique symbol;

/** A persistent typed object in the FrameKit hierarchy. */
export type Node<Properties extends NodeProperties = NodeProperties> = {
  readonly [nodeProperties]: Properties;
  /** The concrete FrameKit node type, such as `Frame` or `TextButton`. */
  readonly ClassName: string;
  /** This node's hierarchy parent. Assigning it reparents or detaches the node. */
  Parent: Node | undefined;
} & Properties &
  NodeMethods<Properties>;

export type BaseNodeState<Properties extends NodeProperties = NodeProperties> = {
  className: string;
  properties: Properties;
  parent: Node | undefined;
  destroyed: boolean;
  cleanups: Set<() => void>;
};

/** Internal tree-only state used by lightweight test nodes. */
export type GroupNodeState<Properties extends NodeProperties = NodeProperties> =
  BaseNodeState<Properties> & {
    kind: 'group';
    children: Node[];
  };

export type NodeState<Properties extends NodeProperties = NodeProperties> =
  | GroupNodeState<Properties>
  | GuiNodeState<Properties>
  | StyleModifierState<Properties>
  | LayoutNodeState<Properties>;

const states = new WeakMap<Node, NodeState>();

export function createBaseState<Properties extends NodeProperties>(
  className: string,
  properties: Properties,
): BaseNodeState<Properties> {
  return { className, properties, parent: undefined, destroyed: false, cleanups: new Set() };
}

/** Merges constructor properties while rejecting misspelled or unsupported keys. */
export function mergeProperties<Properties extends NodeProperties>(
  defaultProperties: Properties,
  initial: Partial<Properties>,
): Properties {
  validatePropertyPatch(defaultProperties, initial);
  return { ...defaultProperties, ...initial };
}

/** Rejects unknown, missing, and non-finite property values. */
export function validatePropertyPatch<Properties extends NodeProperties>(
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

export function registerNode<Properties extends NodeProperties>(
  node: Node<Properties>,
  state: NodeState<Properties>,
): void {
  states.set(node, state as NodeState);
}

/** Returns the private state behind a public node handle. */
export function getNodeState<Properties extends NodeProperties>(
  node: Node<Properties>,
): NodeState<Properties> {
  const state = states.get(node);
  if (!state) throw new TypeError('Expected a FrameKit node.');
  return state as NodeState<Properties>;
}

export function getChildren<Properties extends NodeProperties>(
  state: NodeState<Properties>,
): Node[] {
  return state.kind === 'group' || state.kind === 'gui' ? state.children : [];
}

export function isModifierState<Properties extends NodeProperties>(
  state: NodeState<Properties>,
): state is StyleModifierState<Properties> | LayoutNodeState<Properties> {
  return state.kind === 'style' || state.kind === 'layout';
}

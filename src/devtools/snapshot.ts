import { getAnimatedProperties } from '#animation/runtime/ownership.js';
import { resolveOwnerDocument } from '#internal/dom/environment.js';
import type { Instance } from '#internal/runtime/node/instance.js';
import { getNodeState, getChildren, isGuiNode } from '#internal/runtime/node/registry.js';

/** A detached, readonly diagnostic snapshot. Cleanup registrations are not a listener count. */
export type InstanceSnapshot = Readonly<{
  className: string;
  destroyed: boolean;
  parent: Instance | undefined;
  children: readonly Instance[];
  properties: Readonly<Record<string, unknown>>;
  cleanupRegistrations: number;
  animatedProperties: readonly string[];
}>;

/** Reads live or destroyed handles, redacting password text from diagnostic output. */
export const inspectInstance = (node: Instance): InstanceSnapshot => {
  const state = getNodeState(node);
  const properties: Record<string, unknown> = { ...state.properties };
  if (state.className === 'TextInput' && properties.InputType === 'Password') {
    properties.Text = '[redacted]';
  }
  return Object.freeze({
    className: state.className,
    destroyed: state.destroyed,
    parent: state.parent,
    children: Object.freeze([...getChildren(state)]),
    properties: Object.freeze(properties),
    cleanupRegistrations: state.cleanups.size,
    animatedProperties: Object.freeze(getAnimatedProperties(node).map(String)),
  });
};

/** Resolves the inspected tree's document, including attached element-less modifiers. */
export const inspectionDocument = (root: Instance): Document => {
  for (let node: Instance | undefined = root; node; node = node.Parent) {
    if (isGuiNode(node)) {
      return node.unsafeElement.ownerDocument;
    }
  }
  return resolveOwnerDocument({});
};

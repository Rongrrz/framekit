import type { Node } from '../runtime/state';

export type AnimationOwner = {
  cancelPropertyFromConflict(property: PropertyKey): void;
};

const activeProperties = new WeakMap<Node, Map<PropertyKey, AnimationOwner>>();

export function claimAnimationProperties(
  node: Node,
  properties: readonly PropertyKey[],
  owner: AnimationOwner,
): void {
  let active = activeProperties.get(node);
  if (!active) {
    active = new Map();
    activeProperties.set(node, active);
  }

  const conflicts: [PropertyKey, AnimationOwner][] = [];
  for (const property of properties) {
    const currentOwner = active.get(property);
    if (currentOwner && currentOwner !== owner) conflicts.push([property, currentOwner]);
  }
  for (const [property, currentOwner] of conflicts) {
    currentOwner.cancelPropertyFromConflict(property);
  }
  // A conflicting owner may have released the final property and removed this map.
  activeProperties.set(node, active);
  for (const property of properties) active.set(property, owner);
}

export function releaseAnimationProperties(
  node: Node,
  properties: readonly PropertyKey[],
  owner: AnimationOwner,
): void {
  const active = activeProperties.get(node);
  if (!active) return;
  for (const property of properties) {
    if (active.get(property) === owner) active.delete(property);
  }
  if (active.size === 0) activeProperties.delete(node);
}

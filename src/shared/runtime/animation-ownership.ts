import type { Node } from './node';

export type AnimationOwner = {
  cancelPropertyFromConflict(property: PropertyKey): void;
};

const ownersByNode = new WeakMap<Node, Map<PropertyKey, AnimationOwner>>();

export function claimAnimationProperties(
  node: Node,
  properties: readonly PropertyKey[],
  owner: AnimationOwner,
): void {
  for (const property of properties) {
    cancelConflictingPropertyOwner(node, property, owner);
    getOrCreateNodeOwners(node).set(property, owner);
  }
}

/** Cancels every current owner of the requested properties without claiming replacements. */
export function cancelAnimationProperties(node: Node, properties: readonly PropertyKey[]): void {
  for (const property of properties) cancelConflictingPropertyOwner(node, property);
}

export function releaseAnimationProperties(
  node: Node,
  properties: readonly PropertyKey[],
  owner: AnimationOwner,
): void {
  const propertyOwners = ownersByNode.get(node);
  if (!propertyOwners) return;
  for (const property of properties) {
    if (propertyOwners.get(property) === owner) propertyOwners.delete(property);
  }
  if (propertyOwners.size === 0) ownersByNode.delete(node);
}

function getOrCreateNodeOwners(node: Node): Map<PropertyKey, AnimationOwner> {
  const existing = ownersByNode.get(node);
  if (existing) return existing;
  const created = new Map<PropertyKey, AnimationOwner>();
  ownersByNode.set(node, created);
  return created;
}

function cancelConflictingPropertyOwner(
  node: Node,
  property: PropertyKey,
  ownerToKeep?: AnimationOwner,
): void {
  let owner = ownersByNode.get(node)?.get(property);
  while (owner && owner !== ownerToKeep) {
    owner.cancelPropertyFromConflict(property);
    // Cancellation is synchronous and may transfer ownership, so always reread the registry.
    const nextOwner = ownersByNode.get(node)?.get(property);
    if (nextOwner === owner) {
      throw new Error(`Animation owner did not release property "${String(property)}".`);
    }
    owner = nextOwner;
  }
}

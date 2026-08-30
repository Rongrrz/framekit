import type { Instance } from './node';

export type AnimationOwner = {
  cancelPropertyFromConflict(property: PropertyKey): void;
};

const ownersByNode = new WeakMap<Instance, Map<PropertyKey, AnimationOwner>>();

export function claimAnimationProperties(
  node: Instance,
  properties: readonly PropertyKey[],
  owner: AnimationOwner,
): void {
  const claimedProperties: PropertyKey[] = [];
  try {
    for (const property of properties) {
      const alreadyOwned = ownersByNode.get(node)?.get(property) === owner;
      cancelConflictingPropertyOwner(node, property, owner);
      getOrCreateNodeOwners(node).set(property, owner);
      if (!alreadyOwned) claimedProperties.push(property);
    }
  } catch (error) {
    releaseAnimationProperties(node, claimedProperties, owner);
    throw error;
  }
}

/** Cancels every current owner of the requested properties without claiming replacements. */
export function cancelAnimationProperties(
  node: Instance,
  properties: readonly PropertyKey[],
): void {
  const errors: unknown[] = [];
  for (const property of properties) {
    try {
      cancelConflictingPropertyOwner(node, property);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) {
    throw new AggregateError(errors, 'Multiple animations failed while releasing properties.');
  }
}

export function releaseAnimationProperties(
  node: Instance,
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

function getOrCreateNodeOwners(node: Instance): Map<PropertyKey, AnimationOwner> {
  const existing = ownersByNode.get(node);
  if (existing) return existing;
  const created = new Map<PropertyKey, AnimationOwner>();
  ownersByNode.set(node, created);
  return created;
}

function cancelConflictingPropertyOwner(
  node: Instance,
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

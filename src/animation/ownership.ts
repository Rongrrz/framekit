import type { Instance, InstanceProperties } from '../shared/runtime/node';
import { subscribeToPropertyWrite } from '../shared/runtime/node-properties';
import type { Unsubscribe } from '../shared/runtime/signal';

export type AnimationOwner = {
  cancelPropertyFromConflict(property: PropertyKey): void;
};

type PropertyClaim = Readonly<{
  owner: AnimationOwner;
  unsubscribe: Unsubscribe;
}>;

const claimsByNode = new WeakMap<Instance, Map<PropertyKey, PropertyClaim>>();
const writesByNode = new WeakMap<Instance, Map<PropertyKey, unknown>>();

export function claimAnimationProperties<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  properties: readonly (keyof Properties)[],
  owner: AnimationOwner,
): void {
  const newlyClaimedProperties: (keyof Properties)[] = [];
  try {
    for (const property of properties) {
      if (claimsByNode.get(node)?.get(property)?.owner === owner) continue;

      cancelConflictingPropertyOwners(node, property, owner);
      const claim = createPropertyClaim(node, property, owner);
      getOrCreateNodeClaims(node).set(property, claim);
      newlyClaimedProperties.push(property);
    }
  } catch (error) {
    releaseAnimationProperties(node, newlyClaimedProperties, owner);
    throw error;
  }
}

export function releaseAnimationProperties<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  properties: readonly (keyof Properties)[],
  owner: AnimationOwner,
): void {
  const propertyClaims = claimsByNode.get(node);
  if (!propertyClaims) return;

  for (const property of properties) {
    const claim = propertyClaims.get(property);
    if (claim?.owner !== owner) continue;
    propertyClaims.delete(property);
    claim.unsubscribe();
  }
  if (propertyClaims.size === 0) claimsByNode.delete(node);
}

/** Applies values while allowing property observers to distinguish animation writes. */
export function applyAnimationProperties<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  patch: Partial<Properties>,
  owner: AnimationOwner,
): void {
  const properties = Object.keys(patch) as (keyof Properties)[];
  const propertyClaims = claimsByNode.get(node);
  for (const property of properties) {
    if (propertyClaims?.get(property)?.owner !== owner) {
      throw new Error(`Animation does not own property "${String(property)}".`);
    }
  }

  const writes = getOrCreateNodeWrites(node);
  const previousWrites = properties.map((property) => ({
    property,
    hadValue: writes.has(property),
    value: writes.get(property),
  }));
  for (const property of properties) writes.set(property, patch[property]);

  try {
    node.setProperties(patch);
  } finally {
    for (const previous of previousWrites) {
      if (previous.hadValue) writes.set(previous.property, previous.value);
      else writes.delete(previous.property);
    }
    if (writes.size === 0) writesByNode.delete(node);
  }
}

function createPropertyClaim<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  property: keyof Properties,
  owner: AnimationOwner,
): PropertyClaim {
  const unsubscribe = subscribeToPropertyWrite(node, property, (value) => {
    if (isAnimationWrite(node, property, value)) return;
    cancelConflictingPropertyOwners(node, property);
  });
  return { owner, unsubscribe };
}

function cancelConflictingPropertyOwners(
  node: Instance,
  property: PropertyKey,
  ownerToKeep?: AnimationOwner,
): void {
  const errors: unknown[] = [];
  let owner = claimsByNode.get(node)?.get(property)?.owner;

  while (owner && owner !== ownerToKeep) {
    try {
      owner.cancelPropertyFromConflict(property);
    } catch (error) {
      errors.push(error);
    }

    const nextOwner = claimsByNode.get(node)?.get(property)?.owner;
    if (nextOwner === owner) {
      errors.push(new Error(`Animation owner did not release property "${String(property)}".`));
      break;
    }
    owner = nextOwner;
  }

  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) {
    throw new AggregateError(
      errors,
      `Multiple animations failed while releasing "${String(property)}".`,
    );
  }
}

function getOrCreateNodeClaims(node: Instance): Map<PropertyKey, PropertyClaim> {
  const existing = claimsByNode.get(node);
  if (existing) return existing;
  const created = new Map<PropertyKey, PropertyClaim>();
  claimsByNode.set(node, created);
  return created;
}

function getOrCreateNodeWrites(node: Instance): Map<PropertyKey, unknown> {
  const existing = writesByNode.get(node);
  if (existing) return existing;
  const created = new Map<PropertyKey, unknown>();
  writesByNode.set(node, created);
  return created;
}

function isAnimationWrite(node: Instance, property: PropertyKey, value: unknown): boolean {
  const writes = writesByNode.get(node);
  return writes?.has(property) === true && Object.is(writes.get(property), value);
}

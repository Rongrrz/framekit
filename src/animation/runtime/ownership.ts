import { throwCollectedErrors } from '#internal/errors.js';
import type { Instance, InstanceProperties } from '#internal/runtime/node/instance.js';
import {
  setNodeProperties,
  subscribeToPropertyWrite,
} from '#internal/runtime/systems/properties.js';
import type { Unsubscribe } from '#state/signal.js';

export type AnimationOwner = {
  cancelPropertyFromConflict(property: PropertyKey): void;
};

type PropertyClaim = Readonly<{
  owner: AnimationOwner;
  unsubscribe: Unsubscribe;
}>;

const claimsByNode = new WeakMap<Instance, Map<PropertyKey, PropertyClaim>>();

export function claimAnimationProperties<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  properties: readonly (keyof Properties)[],
  owner: AnimationOwner,
): void {
  const newlyClaimedProperties: (keyof Properties)[] = [];

  try {
    for (const property of properties) {
      if (claimsByNode.get(node)?.get(property)?.owner === owner) {
        continue;
      }

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

  if (!propertyClaims) {
    return;
  }

  for (const property of properties) {
    const claim = propertyClaims.get(property);

    if (claim?.owner !== owner) {
      continue;
    }

    propertyClaims.delete(property);
    claim.unsubscribe();
  }

  if (propertyClaims.size === 0) {
    claimsByNode.delete(node);
  }
}

/** Applies values while allowing property observers to distinguish animation writes. */
export function applyAnimationProperties<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  patch: Partial<Properties>,
  owner: AnimationOwner,
): void {
  const constrainedPatch = constrainAnimationPatch(patch);
  const properties = Object.keys(constrainedPatch) as (keyof Properties)[];
  const propertyClaims = claimsByNode.get(node);

  for (const property of properties) {
    if (propertyClaims?.get(property)?.owner !== owner) {
      throw new Error(`Animation does not own property "${String(property)}".`);
    }
  }

  setNodeProperties(node, constrainedPatch, owner);
}

const unitIntervalProperties = new Set<PropertyKey>([
  'BackgroundTransparency',
  'GroupTransparency',
  'ImageTransparency',
  'PlaceholderTransparency',
  'ScrollBarImageTransparency',
  'TextTransparency',
  'Transparency',
]);

const nonNegativeProperties = new Set<PropertyKey>([
  'BlurRadius',
  'CornerRadius',
  'Scale',
  'ScrollBarThickness',
  'Thickness',
]);

/** Keeps easing overshoot inside property domains that ordinary writes enforce. */
function constrainAnimationPatch<Properties extends InstanceProperties>(
  patch: Partial<Properties>,
): Partial<Properties> {
  const constrained = { ...patch };

  for (const property of Object.keys(constrained) as (keyof Properties)[]) {
    const value = constrained[property];

    if (typeof value !== 'number') {
      continue;
    }

    const constrainedValue = unitIntervalProperties.has(property)
      ? Math.min(1, Math.max(0, value))
      : nonNegativeProperties.has(property)
        ? Math.max(0, value)
        : property === 'AspectRatio'
          ? Math.max(Number.EPSILON, value)
          : value;

    constrained[property] = constrainedValue as Properties[keyof Properties];
  }

  return constrained;
}

function createPropertyClaim<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  property: keyof Properties,
  owner: AnimationOwner,
): PropertyClaim {
  const unsubscribe = subscribeToPropertyWrite(node, property, (_value, writer) => {
    if (writer === owner) {
      return;
    }

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

  throwCollectedErrors(errors, `Multiple animations failed while releasing "${String(property)}".`);
}

function getOrCreateNodeClaims(node: Instance): Map<PropertyKey, PropertyClaim> {
  const existing = claimsByNode.get(node);

  if (existing) {
    return existing;
  }

  const created = new Map<PropertyKey, PropertyClaim>();
  claimsByNode.set(node, created);

  return created;
}

/** Optional diagnostics copy claims without exposing mutable ownership maps. */
export const getAnimatedProperties = (node: Instance): readonly PropertyKey[] => [
  ...(claimsByNode.get(node)?.keys() ?? []),
];

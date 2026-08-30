import { cancelAnimationProperties } from './animation-ownership';
import type { Instance, InstanceProperties } from './node';
import { getActiveNodeState, getNodeState, validatePropertyPatch } from './node-state';
import { renderPropertyChanges } from './render';
import { emitNodeEvent, subscribeToNodeEvent, type Unsubscribe } from './signal';

type PropertyCommit<Properties extends InstanceProperties> = Readonly<{
  previousProperties: Properties;
  nextProperties: Properties;
  changedProperties: readonly (keyof Properties)[];
}>;

/** Applies a user-requested property change, taking control from active animations. */
export function setNodeProperties<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  patch: Partial<Properties>,
): void {
  const requestedProperties = Object.keys(patch);
  const commit = commitPropertyPatch(node, patch);
  const errors: unknown[] = [];

  try {
    cancelAnimationProperties(node, requestedProperties);
  } catch (error) {
    errors.push(error);
  }

  if (commit) {
    try {
      emitPropertyChanges(node, commit);
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) {
    throw new AggregateError(errors, 'A property changed, but related callbacks failed.');
  }
}

/** Applies a property patch without changing animation ownership. */
export function applyPropertyPatch<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  patch: Partial<Properties>,
): void {
  const commit = commitPropertyPatch(node, patch);
  if (commit) emitPropertyChanges(node, commit);
}

function commitPropertyPatch<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  patch: Partial<Properties>,
): PropertyCommit<Properties> | undefined {
  const state = getActiveNodeState(node);
  validatePropertyPatch(state.properties, patch);

  const previousProperties = state.properties;
  const changedProperties = (Object.keys(patch) as (keyof Properties)[]).filter(
    (property) => !Object.is(previousProperties[property], patch[property]),
  );
  if (changedProperties.length === 0) return;

  const nextProperties = { ...state.properties, ...patch };
  state.validateProperties?.(nextProperties);
  state.properties = nextProperties;
  try {
    renderPropertyChanges(node, changedProperties);
  } catch (error) {
    state.properties = previousProperties;
    try {
      renderPropertyChanges(node, changedProperties);
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        'A property update failed, and rendering could not be fully restored.',
      );
    }
    throw error;
  }

  return { previousProperties, nextProperties, changedProperties };
}

function emitPropertyChanges<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  commit: PropertyCommit<Properties>,
): void {
  for (const property of commit.changedProperties) {
    emitNodeEvent(
      node,
      property,
      commit.nextProperties[property],
      commit.previousProperties[property],
    );
  }
}

/** Subscribes to one property and returns an idempotent unsubscribe function. */
export function subscribeToPropertyChange<
  Properties extends InstanceProperties,
  Property extends keyof Properties,
>(
  node: Instance<Properties>,
  property: Property,
  listener: (value: Properties[Property], previousValue: Properties[Property]) => void,
): Unsubscribe {
  const properties = getNodeState(node).properties;
  if (!Object.hasOwn(properties, property)) {
    throw new TypeError(`Unknown property "${String(property)}" on ${properties.Name}.`);
  }
  return subscribeToNodeEvent(node, property, listener);
}

/** Returns a readonly snapshot used by rendering and animation internals. */
export function getPropertiesSnapshot<Properties extends InstanceProperties>(
  node: Instance<Properties>,
): Readonly<Properties> {
  return { ...getActiveNodeState(node).properties };
}

/** Reads one current property without allocating a snapshot. */
export function getNodeProperty<
  Properties extends InstanceProperties,
  Property extends keyof Properties,
>(node: Instance<Properties>, property: Property): Properties[Property] {
  return getActiveNodeState(node).properties[property];
}

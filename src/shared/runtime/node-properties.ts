import type { Instance, InstanceProperties } from './node';
import { getActiveNodeState, getNodeState, validatePropertyPatch } from './node-state';
import { renderPropertyChanges } from './render';
import { emitNodeEvent, subscribeToNodeEvent, type Unsubscribe } from './signal';

const propertyWriteEventKeys = new Map<PropertyKey, symbol>();

type PropertyCommit<Properties extends InstanceProperties> = Readonly<{
  previousProperties: Properties;
  nextProperties: Properties;
  changedProperties: readonly (keyof Properties)[];
}>;

/** Validates, renders, and publishes a user-requested property write. */
export function setNodeProperties<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  patch: Partial<Properties>,
): void {
  applyPropertyPatch(node, patch);
}

/** Applies a property patch produced by browser or other internal synchronization. */
export function applyPropertyPatch<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  patch: Partial<Properties>,
): void {
  const requestedProperties = Object.keys(patch) as (keyof Properties)[];
  const commit = commitPropertyPatch(node, patch);
  const errors: unknown[] = [];

  for (const property of requestedProperties) {
    try {
      emitNodeEvent(node, getPropertyWriteEventKey(property), patch[property]);
    } catch (error) {
      errors.push(error);
    }
  }

  if (commit) emitPropertyChanges(node, commit, errors);
  throwCallbackErrors(errors);
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
  errors: unknown[],
): void {
  for (const property of commit.changedProperties) {
    try {
      emitNodeEvent(
        node,
        property,
        commit.nextProperties[property],
        commit.previousProperties[property],
      );
    } catch (error) {
      errors.push(error);
    }
  }
}

/** Observes every successful write, including writes that keep the current value. */
export function subscribeToPropertyWrite<
  Properties extends InstanceProperties,
  Property extends keyof Properties,
>(
  node: Instance<Properties>,
  property: Property,
  listener: (value: Properties[Property]) => void,
): Unsubscribe {
  return subscribeToNodeEvent(node, getPropertyWriteEventKey(property), listener);
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

/** Returns a readonly snapshot for consumers that need several current properties. */
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

function getPropertyWriteEventKey(property: PropertyKey): symbol {
  const existing = propertyWriteEventKeys.get(property);
  if (existing) return existing;
  const created = Symbol(`Property write: ${String(property)}`);
  propertyWriteEventKeys.set(property, created);
  return created;
}

function throwCallbackErrors(errors: readonly unknown[]): void {
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) {
    throw new AggregateError(errors, 'Multiple property callbacks failed.');
  }
}

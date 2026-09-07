import { throwCollectedErrors } from './errors';
import type { Instance, InstanceProperties } from './node';
import { emitNodeEvent, subscribeToNodeEvent } from './node-events';
import { getActiveNodeState, getNodeState } from './node-state';
import { renderPropertyChanges } from './render';
import type { Unsubscribe } from './signal';
import { assertString } from './validation';

const propertyWriteEventKeys = new Map<PropertyKey, symbol>();

type PropertyCommit<Properties extends InstanceProperties> = Readonly<{
  previousProperties: Properties;
  nextProperties: Properties;
  changedProperties: ReadonlySet<keyof Properties>;
}>;

/**
 * All property writes, including animations and browser input, enter here.
 * Validate and render before notifying observers; a failed render restores the previous state.
 */
export function setNodeProperties<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  patch: Partial<Properties>,
): void {
  const requestedProperties = Object.keys(patch) as (keyof Properties)[];
  const commit = commitPropertyPatch(node, patch, requestedProperties);
  const errors: unknown[] = [];

  for (const property of requestedProperties) {
    try {
      emitNodeEvent(node, getPropertyWriteEventKey(property), patch[property]);
    } catch (error) {
      errors.push(error);
    }
  }

  if (commit) emitPropertyChanges(node, commit, errors);
  throwCollectedErrors(errors, 'Multiple property callbacks failed.');
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

/** Reads the internal property record for synchronous runtime rendering without cloning it. */
export function getNodeProperties<Properties extends InstanceProperties>(
  node: Instance<Properties>,
): Readonly<Properties> {
  return getActiveNodeState(node).properties;
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

/** Merges constructor properties while rejecting misspelled or unsupported keys. */
export function mergeProperties<Properties extends InstanceProperties>(
  defaultProperties: Properties,
  initialProperties: Partial<Properties>,
): Properties {
  validatePropertyPatch(defaultProperties, initialProperties);
  return { ...defaultProperties, ...initialProperties };
}

/** Rejects unknown, missing, and non-finite property values. */
function validatePropertyPatch<Properties extends InstanceProperties>(
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

function commitPropertyPatch<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  patch: Partial<Properties>,
  requestedProperties: readonly (keyof Properties)[],
): PropertyCommit<Properties> | undefined {
  const state = getActiveNodeState(node);
  validatePropertyPatch(state.properties, patch);

  const previousProperties = state.properties;
  const changedProperties = new Set(
    requestedProperties.filter(
      (property) => !Object.is(previousProperties[property], patch[property]),
    ),
  );
  if (changedProperties.size === 0) return;

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

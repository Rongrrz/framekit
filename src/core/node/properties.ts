import { snapshotPropertyValue } from '../internal/snapshot.js';
import { assertString } from '../internal/validation.js';
import * as rendering from '../render.js';
import type { Unsubscribe } from '../state/signal.js';
import { emitNodeEvent, subscribeToNodeEvent } from './events.js';
import type { Instance, InstanceProperties } from './instance.js';
import { getModifierTarget } from './modifier.js';
import { getActiveNodeState, getNodeState, type NodeState } from './state.js';

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
  const propertySnapshot = snapshotPropertyValue(patch);
  const requestedProperties = Object.keys(propertySnapshot) as (keyof Properties)[];
  const commit = commitPropertyPatch(node, propertySnapshot, requestedProperties);

  for (const property of requestedProperties) {
    emitNodeEvent(node, getPropertyWriteEventKey(property), propertySnapshot[property]);
  }

  if (commit) emitPropertyChanges(node, commit);
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

/** Validates a property patch without committing it or notifying observers. */
export function validateNodeProperties<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  patch: Partial<Properties>,
): void {
  const state = getActiveNodeState(node);
  validatePropertyPatch(state.properties, patch);
  const nextProperties = { ...state.properties, ...patch };
  state.validateProperties?.(nextProperties);
  validateModifierRelationships(state, nextProperties);
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
  return snapshotPropertyValue({ ...defaultProperties, ...initialProperties });
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
  validateNodeProperties(node, patch);

  const previousProperties = state.properties;
  const changedProperties = new Set(
    requestedProperties.filter(
      (property) => !Object.is(previousProperties[property], patch[property]),
    ),
  );
  if (changedProperties.size === 0) return;

  const nextProperties = { ...state.properties, ...patch };
  state.properties = nextProperties;
  try {
    rendering.renderPropertyChanges(node, changedProperties);
  } catch (error) {
    state.properties = previousProperties;
    try {
      rendering.renderPropertyChanges(node, changedProperties);
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        'A property update failed, and rendering could not be fully restored.',
      );
    }
    throw error;
  }

  return { previousProperties, nextProperties: state.properties, changedProperties };
}

function validateModifierRelationships<Properties extends InstanceProperties>(
  state: NodeState<Properties>,
  nextProperties: Readonly<Properties>,
): void {
  if (state.kind === 'style' && state.parent) {
    const parentState = getNodeState(state.parent);
    if (parentState.kind === 'gui') {
      state.validateTarget?.(nextProperties, getModifierTarget(parentState));
    }
    return;
  }
  if (state.kind !== 'gui') return;

  for (const modifier of state.modifiers.values()) {
    const modifierState = getNodeState(modifier);
    if (modifierState.kind === 'style') {
      modifierState.validateTarget?.(modifierState.properties, {
        properties: nextProperties,
        capabilities: state.capabilities,
      });
    }
  }
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

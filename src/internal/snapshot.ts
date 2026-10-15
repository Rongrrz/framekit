const immutableSnapshots = new WeakSet<object>();

/** Copies JSON-like property values so later caller mutation cannot bypass FrameKit updates. */
export function snapshotPropertyValue<Value>(value: Value): Value {
  if (!isSnapshotContainer(value)) {
    return value;
  }
  return snapshotValue(value, new WeakMap()) as Value;
}

function snapshotValue(value: unknown, copies: WeakMap<object, object>): unknown {
  if (!isSnapshotContainer(value) || immutableSnapshots.has(value)) {
    return value;
  }
  if (isImmutableSnapshot(value, new WeakSet())) {
    // A fully frozen data graph cannot become mutable later. Accessors never enter this cache.
    immutableSnapshots.add(value);
    return value;
  }

  const existing = copies.get(value);
  if (existing) {
    return existing;
  }

  const copy: unknown[] | Record<PropertyKey, unknown> = Array.isArray(value)
    ? []
    : Object.create(Object.getPrototypeOf(value) === null ? null : Object.prototype);
  copies.set(value, copy);

  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable) {
      continue;
    }
    Object.defineProperty(copy, key, {
      configurable: false,
      enumerable: true,
      value: snapshotValue(Reflect.get(value, key), copies),
      writable: false,
    });
  }
  return Object.freeze(copy);
}

function isSnapshotContainer(value: unknown): value is object {
  // Properties contain data, not live native objects. A caller-controlled toStringTag must
  // not let an otherwise valid structured value bypass copying and retain mutable state.
  return typeof value === 'object' && value !== null;
}

function isImmutableSnapshot(value: object, checked: WeakSet<object>): boolean {
  if (!Object.isFrozen(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && prototype !== Array.prototype) {
    // Freezing an object does not freeze data or getters inherited from a custom prototype.
    return false;
  }
  if (checked.has(value)) {
    return true;
  }
  checked.add(value);

  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable) {
      continue;
    }
    if (!('value' in descriptor)) {
      return false;
    }
    const child = descriptor.value;
    if (isSnapshotContainer(child) && !isImmutableSnapshot(child, checked)) {
      return false;
    }
  }
  return true;
}

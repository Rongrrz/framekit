/** Copies JSON-like property values so later caller mutation cannot bypass FrameKit updates. */
export function snapshotPropertyValue<Value>(value: Value): Value {
  return snapshotValue(value, new WeakMap()) as Value;
}

function snapshotValue(value: unknown, copies: WeakMap<object, object>): unknown {
  if (!isSnapshotContainer(value) || isImmutableSnapshot(value, new WeakSet())) return value;

  const existing = copies.get(value);
  if (existing) return existing;

  const copy: unknown[] | Record<PropertyKey, unknown> = Array.isArray(value)
    ? []
    : Object.create(Object.getPrototypeOf(value) === null ? null : Object.prototype);
  copies.set(value, copy);

  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable) continue;
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
  if (typeof value !== 'object' || value === null) return false;
  if (Array.isArray(value)) return true;
  const tag = Object.prototype.toString.call(value);
  return tag === '[object Object]';
}

function isImmutableSnapshot(value: object, checked: WeakSet<object>): boolean {
  if (!Object.isFrozen(value)) return false;
  if (checked.has(value)) return true;
  checked.add(value);

  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !('value' in descriptor)) continue;
    const child = descriptor.value;
    if (isSnapshotContainer(child) && !isImmutableSnapshot(child, checked)) return false;
  }
  return true;
}

/** Rejects a runtime value that is not one of a property's supported string values. */
export function assertAllowedValue<Value extends string>(
  value: Value,
  allowedValues: readonly Value[],
  propertyName: string,
): void {
  if (!allowedValues.includes(value)) throw new TypeError(`Unknown ${propertyName}.`);
}

export function assertBoolean(value: unknown, propertyName: string): asserts value is boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${propertyName} must be a boolean.`);
}

export function assertString(value: unknown, propertyName: string): asserts value is string {
  if (typeof value !== 'string') throw new TypeError(`${propertyName} must be a string.`);
}

export function assertFiniteNumber(value: unknown, propertyName: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${propertyName} must be a finite number.`);
  }
}

export function assertInteger(value: unknown, propertyName: string): asserts value is number {
  if (!Number.isInteger(value)) throw new TypeError(`${propertyName} must be an integer.`);
}

export function assertNonNegativeFinite(
  value: unknown,
  propertyName: string,
): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${propertyName} must be a non-negative finite number.`);
  }
}

export function assertPositiveFinite(
  value: unknown,
  propertyName: string,
): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${propertyName} must be a positive finite number.`);
  }
}

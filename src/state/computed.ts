import { createSignalEmitter, emitSignalSafely, type Unsubscribe } from './signal.js';
import type { ReadonlyObservableValue } from './value.js';

/** A readonly value derived from explicitly declared observable dependencies. */
export type ComputedValue<T> = ReadonlyObservableValue<T>;

/**
 * Creates a readonly derived value. Every observable read by derive must be included in
 * dependencies so changes can be published while the computed value is observed.
 */
export function createComputedValue<T>(
  dependencies: readonly ReadonlyObservableValue<unknown>[],
  derive: () => T,
): ComputedValue<T> {
  const sources = [...new Set(dependencies)];
  const changedSignal = createSignalEmitter<[T]>();
  let currentValue!: T;
  let observerCount = 0;
  let sourceUnsubscribes: Unsubscribe[] = [];

  const recompute = (): void => {
    const nextValue = derive();
    if (Object.is(currentValue, nextValue)) {
      return;
    }
    currentValue = nextValue;
    emitSignalSafely(changedSignal, currentValue);
  };

  const stopObservingSources = (): void => {
    for (const unsubscribe of sourceUnsubscribes) {
      unsubscribe();
    }
    sourceUnsubscribes = [];
  };

  const startObservingSources = (): void => {
    currentValue = derive();
    const unsubscribes: Unsubscribe[] = [];
    try {
      for (const source of sources) {
        unsubscribes.push(source.onChange(recompute));
      }
    } catch (error) {
      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
      throw error;
    }
    sourceUnsubscribes = unsubscribes;
  };

  const onChange = (listener: (value: T) => void): Unsubscribe => {
    if (observerCount === 0) {
      startObservingSources();
    }
    const unsubscribeSignal = changedSignal.subscribe(listener);
    observerCount += 1;
    let subscribed = true;

    return () => {
      if (!subscribed) {
        return;
      }
      subscribed = false;
      unsubscribeSignal();
      observerCount -= 1;
      if (observerCount === 0) {
        stopObservingSources();
      }
    };
  };

  return Object.freeze({
    get: () => (observerCount === 0 ? derive() : currentValue),
    onChange,
  });
}

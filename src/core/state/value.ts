import { createSignalEmitter, emitSignalSafely, type Unsubscribe } from './signal.js';

type ValueListener<T> = (value: T) => void;
type ValueUpdater<T> = (currentValue: T) => T;

/** A small synchronous container for explicitly shared state. */
export type ObservableValue<T> = {
  /** Returns the current value. */
  get(): T;
  /** Replaces the value and notifies listeners when it changed. */
  set(nextValue: T): void;
  /** Replaces the value using its current value. */
  update(updater: ValueUpdater<T>): void;
  /** Subscribes to later changes and returns an unsubscribe function. */
  onChange(listener: ValueListener<T>): Unsubscribe;
};

/** Creates an observable value that synchronously notifies listeners when it changes. */
export function createObservableValue<T>(initialValue: T): ObservableValue<T> {
  const changedSignal = createSignalEmitter<[T]>();
  let currentValue = initialValue;

  function set(nextValue: T): void {
    if (Object.is(currentValue, nextValue)) {
      return;
    }
    currentValue = nextValue;
    emitSignalSafely(changedSignal, currentValue);
  }

  function update(updater: ValueUpdater<T>): void {
    set(updater(currentValue));
  }

  return Object.freeze({
    get: () => currentValue,
    set,
    update,
    onChange: changedSignal.subscribe,
  });
}

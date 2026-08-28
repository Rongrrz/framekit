import { addCleanup, assertNodeActive, isDestroyed } from './node-lifecycle';
import type { Node } from './node-state';
import { createSignal, type Unsubscribe } from './signal';

type ValueListener<T> = (value: T) => void;
type ValueUpdater<T> = (currentValue: T) => T;

/** A small synchronous container for explicitly shared state. */
export type Value<T> = {
  /** Returns the current value. */
  get(): T;
  /** Replaces the value and notifies listeners when it changed. */
  set(nextValue: T): void;
  /** Replaces the value using its current value. */
  update(updater: ValueUpdater<T>): void;
  /** Subscribes to later changes and returns an unsubscribe function. */
  onChange(listener: ValueListener<T>): Unsubscribe;
};

/** Creates a value that synchronously notifies listeners when it changes. */
export function createValue<T>(initialValue: T): Value<T> {
  const changed = createSignal<[T]>();
  let currentValue = initialValue;

  function set(nextValue: T): void {
    if (Object.is(currentValue, nextValue)) return;
    currentValue = nextValue;
    changed.emit(currentValue);
  }

  function update(updater: ValueUpdater<T>): void {
    set(updater(currentValue));
  }

  function onChange(listener: ValueListener<T>): Unsubscribe {
    return changed.subscribe(listener);
  }

  return Object.freeze({ get: () => currentValue, set, update, onChange });
}

/** Watches a value until manually stopped or the owning node is destroyed. */
export function watchValue<T>(
  owner: Node,
  value: Value<T>,
  listener: ValueListener<T>,
): Unsubscribe {
  assertNodeActive(owner);
  listener(value.get());
  if (isDestroyed(owner)) return doNothing;

  const unsubscribe = value.onChange(listener);
  let active = true;
  let removeCleanup: Unsubscribe = doNothing;

  function stop(): void {
    if (!active) return;
    active = false;
    removeCleanup();
    unsubscribe();
  }

  removeCleanup = addCleanup(owner, stop);
  return stop;
}

function doNothing(): void {}

import { addCleanup, assertNodeActive, isDestroyed } from './node';
import { createSignal, type Unsubscribe } from './signal';
import type { Node } from './state';

type ValueListener<Value> = (value: Value) => void;
type ValueUpdater<Value> = (currentValue: Value) => Value;

export type ObservableValue<Value> = {
  (): Value;
  (nextValue: Value | ValueUpdater<Value>): void;
  subscribe(listener: ValueListener<Value>): Unsubscribe;
};

/** Creates a value that synchronously notifies subscribers when it changes. */
export function createObservableValue<Value>(initialValue: Value): ObservableValue<Value> {
  const changed = createSignal<[Value]>();
  let currentValue = initialValue;

  function observable(): Value;
  function observable(nextValue: Value | ValueUpdater<Value>): void;
  function observable(nextValue?: Value | ValueUpdater<Value>): Value | void {
    if (arguments.length === 0) return currentValue;
    const resolvedValue =
      typeof nextValue === 'function'
        ? (nextValue as ValueUpdater<Value>)(currentValue)
        : (nextValue as Value);
    if (Object.is(currentValue, resolvedValue)) return;
    currentValue = resolvedValue;
    changed.emit(currentValue);
  }

  function subscribe(listener: ValueListener<Value>): Unsubscribe {
    const unsubscribe = changed.subscribe(listener);
    try {
      listener(currentValue);
    } catch (error) {
      unsubscribe();
      throw error;
    }
    return unsubscribe;
  }

  return Object.freeze(Object.assign(observable, { subscribe }));
}

/** Observes a value until manually stopped or the owning node is destroyed. */
export function observe<Value>(
  owner: Node,
  observable: ObservableValue<Value>,
  listener: ValueListener<Value>,
): Unsubscribe {
  assertNodeActive(owner);
  const unsubscribe = observable.subscribe(listener);
  let active = true;
  let removeCleanup: Unsubscribe = doNothing;

  function stop(): void {
    if (!active) return;
    active = false;
    removeCleanup();
    unsubscribe();
  }

  if (isDestroyed(owner)) stop();
  else removeCleanup = addCleanup(owner, stop);
  return stop;
}

function doNothing(): void {}

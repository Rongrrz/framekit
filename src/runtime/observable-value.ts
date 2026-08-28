import { addCleanup, assertNodeActive, isDestroyed } from './node';
import { createSignal, type Unsubscribe } from './signal';
import type { Node } from './state';

type ValueListener<Value> = (value: Value) => void;
type ValueUpdater<Value> = (currentValue: Value) => Value;

export type ObservableValue<Value> = {
  get(): Value;
  set(nextValue: Value): void;
  update(updater: ValueUpdater<Value>): void;
  subscribe(listener: ValueListener<Value>): Unsubscribe;
};

/** Creates a value that synchronously notifies subscribers when it changes. */
export function createObservableValue<Value>(initialValue: Value): ObservableValue<Value> {
  const changed = createSignal<[Value]>();
  let currentValue = initialValue;

  function set(nextValue: Value): void {
    if (Object.is(currentValue, nextValue)) return;
    currentValue = nextValue;
    changed.emit(currentValue);
  }

  function update(updater: ValueUpdater<Value>): void {
    set(updater(currentValue));
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

  return Object.freeze({ get: () => currentValue, set, update, subscribe });
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

import { addCleanup, assertNodeActive, isDestroyed } from './node';
import { createSignal, type Unsubscribe } from './signal';
import type { Node } from './state';

type ValueListener<Value> = (value: Value) => void;
type ValueUpdater<Value> = (currentValue: Value) => Value;

export type ObservableValue<Value> = {
  (): Value;
  (nextValue: Value): void;
  subscribe(listener: ValueListener<Value>): Unsubscribe;
  update(updater: ValueUpdater<Value>): void;
};

/** Creates a value that synchronously notifies subscribers when it changes. */
export function createObservableValue<Value>(initialValue: Value): ObservableValue<Value> {
  const changed = createSignal<[Value]>();
  let currentValue = initialValue;

  function observable(): Value;
  function observable(nextValue: Value): void;
  function observable(nextValue?: Value): Value | void {
    if (arguments.length === 0) return currentValue;
    if (Object.is(currentValue, nextValue)) return;
    currentValue = nextValue as Value;
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

  function update(updater: ValueUpdater<Value>): void {
    observable(updater(currentValue));
  }

  return Object.freeze(Object.assign(observable, { subscribe, update }));
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

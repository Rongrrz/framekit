import { type Instance, type ReadonlyObservableValue, type Unsubscribe } from 'framekit';

/** Playground convenience for immediate, node-owned value subscriptions. */
export function watchOwnedValue<T>(
  owner: Instance,
  value: ReadonlyObservableValue<T>,
  listener: (value: T) => void,
): Unsubscribe {
  if (owner.isDestroyed()) {
    throw new Error('Observable value subscription owner has been destroyed.');
  }
  listener(value.get());
  if (owner.isDestroyed()) {
    return () => undefined;
  }
  const unsubscribe = value.onChange(listener);
  const unregisterDestroy = owner.onDestroy(unsubscribe);
  return () => {
    unregisterDestroy();
    unsubscribe();
  };
}

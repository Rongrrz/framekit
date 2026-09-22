import { type Instance, type Unsubscribe, type Value } from 'framekit';

/** Playground convenience for immediate, node-owned value subscriptions. */
export function watchOwnedValue<T>(
  owner: Instance,
  value: Value<T>,
  listener: (value: T) => void,
): Unsubscribe {
  if (owner.isDestroyed()) throw new Error('Value subscription owner has been destroyed.');
  listener(value.get());
  if (owner.isDestroyed()) return () => undefined;
  const unsubscribe = value.onChange(listener);
  const unregisterDestroy = owner.onDestroy(unsubscribe);
  return () => {
    unregisterDestroy();
    unsubscribe();
  };
}

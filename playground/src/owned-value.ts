import type { fk } from 'framekit';

/** Playground convenience for immediate, node-owned value subscriptions. */
export function watchOwnedValue<T>(
  owner: fk.Instance,
  value: fk.Value<T>,
  listener: (value: T) => void,
): fk.Unsubscribe {
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

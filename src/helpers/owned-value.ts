import type { Instance } from '#internal/runtime/node/instance.js';
import type { Unsubscribe } from '#state/signal.js';
import type { ReadonlyObservableValue } from '#state/value.js';

/**
 * Delivers the current value and later changes until disposed or the owner is destroyed.
 * Detaching the owner keeps the subscription alive. Writes from the callback use normal
 * property and animation semantics; manual writes do not unsubscribe this watcher.
 */
export const watchOwnedValue = <T>(
  owner: Instance,
  value: ReadonlyObservableValue<T>,
  listener: (value: T) => void,
): Unsubscribe => {
  if (owner.isDestroyed()) {
    throw new Error('Observable value subscription owner has been destroyed.');
  }
  const unsubscribe = value.onChange(listener);
  let disposed = false;
  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    unregisterDestroy();
    unsubscribe();
  };
  const unregisterDestroy = owner.onDestroy(dispose);
  try {
    listener(value.get());
  } catch (error) {
    dispose();
    throw error;
  }
  return dispose;
};

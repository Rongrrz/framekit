export type Unsubscribe = () => void;

/** A synchronous typed signal with explicit subscription cleanup. */
export type Signal<Arguments extends unknown[] = []> = {
  /** Adds a subscriber and returns an idempotent function that removes it. */
  subscribe(subscriber: (...args: Arguments) => void): Unsubscribe;
  /** Notifies a snapshot of the current subscribers in insertion order. */
  emit(...args: Arguments): void;
  /** Removes every current subscriber. */
  clear(): void;
};

/** Creates a small typed signal without lifecycle or class semantics. */
export function signal<Arguments extends unknown[] = []>(): Signal<Arguments> {
  const subscribers = new Set<(...args: Arguments) => void>();

  return {
    subscribe: (listener) => {
      subscribers.add(listener);
      let subscribed = true;

      return () => {
        if (!subscribed) return;
        subscribed = false;
        subscribers.delete(listener);
      };
    },

    emit: (...args) => {
      for (const listener of Array.from(subscribers)) {
        listener(...args);
      }
    },

    clear: () => {
      subscribers.clear();
    },
  };
}

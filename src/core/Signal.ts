export type Unsubscribe = () => void;

export type Signal<Arguments extends unknown[] = []> = {
  subscribe(subscriber: (...args: Arguments) => void): Unsubscribe;
  emit(...args: Arguments): void;
  clear(): void;
};

/** Creates a small typed event channel without lifecycle or class semantics. */
export function signal<Arguments extends unknown[] = []>(): Signal<Arguments> {
  const subscribers = new Set<(...args: Arguments) => void>();

  return {
    subscribe: (listener) => {
      subscribers.add(listener);
      let subscribed = true;

      // Returns a clean-up method for unsubscribing
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

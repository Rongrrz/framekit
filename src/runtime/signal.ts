import { throwCollectedErrors } from './errors';

/** Stops a subscription or unregisters cleanup work. Safe to call repeatedly. */
export type Unsubscribe = () => void;

/** A synchronous typed signal that consumers can listen to. */
export type Signal<Arguments extends unknown[] = []> = {
  /** Adds a listener and returns an idempotent unsubscribe function. */
  subscribe(listener: (...args: Arguments) => void): Unsubscribe;
};

/** A signal whose owner can publish events and clear listeners. */
export type SignalEmitter<Arguments extends unknown[] = []> = Signal<Arguments> & {
  /** Synchronously publishes an event to current listeners. */
  emit(...args: Arguments): void;
  /** Removes every listener. */
  clear(): void;
};

/** Creates a standalone synchronous signal. */
export function createSignal<Arguments extends unknown[] = []>(): SignalEmitter<Arguments> {
  const listeners = new Set<(...args: Arguments) => void>();
  return Object.freeze({
    subscribe: (listener) => {
      listeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        listeners.delete(listener);
      };
    },
    emit: (...args) => {
      const errors: unknown[] = [];
      for (const listener of Array.from(listeners)) {
        try {
          listener(...args);
        } catch (error) {
          errors.push(error);
        }
      }
      throwCollectedErrors(errors, 'Multiple signal listeners failed.');
    },
    clear: () => listeners.clear(),
  });
}

/** Hides publishing methods when an event is exposed to consumers. */
export function readonlySignal<Arguments extends unknown[]>(
  emitter: SignalEmitter<Arguments>,
): Signal<Arguments> {
  return Object.freeze({ subscribe: emitter.subscribe });
}

import { addCleanup, assertNodeActive, isDestroyed } from './node';
import type { Node } from './state';

export type Unsubscribe = () => void;

/** A synchronous typed signal with explicit subscription cleanup. */
export type Signal<Arguments extends unknown[] = []> = {
  subscribe(listener: (...args: Arguments) => void): Unsubscribe;
  emit(...args: Arguments): void;
  clear(): void;
};

/** Creates a standalone synchronous signal. */
export function createSignal<Arguments extends unknown[] = []>(): Signal<Arguments> {
  const listeners = new Set<(...args: Arguments) => void>();
  return {
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
      for (const listener of Array.from(listeners)) listener(...args);
    },
    clear: () => listeners.clear(),
  };
}

const nodeEvents = new WeakMap<Node, Map<PropertyKey, Signal<unknown[]>>>();

/** Subscribes to an event whose listeners are cleared with the node. */
export function onNodeEvent<Arguments extends unknown[]>(
  node: Node,
  event: PropertyKey,
  listener: (...args: Arguments) => void,
): Unsubscribe {
  assertNodeActive(node);
  let events = nodeEvents.get(node);
  if (!events) {
    events = new Map();
    nodeEvents.set(node, events);
    const ownedEvents = events;
    addCleanup(node, () => {
      for (const signal of ownedEvents.values()) signal.clear();
      nodeEvents.delete(node);
    });
  }

  let eventSignal = events.get(event);
  if (!eventSignal) {
    eventSignal = createSignal();
    events.set(event, eventSignal);
  }
  return eventSignal.subscribe(listener as (...args: unknown[]) => void);
}

export function emitNodeEvent<Arguments extends unknown[]>(
  node: Node,
  event: PropertyKey,
  ...args: Arguments
): void {
  if (isDestroyed(node)) return;
  nodeEvents
    .get(node)
    ?.get(event)
    ?.emit(...args);
}

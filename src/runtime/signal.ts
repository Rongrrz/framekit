import { getNodeState, type Node } from './node-state';

export type Unsubscribe = () => void;

/** A synchronous typed signal that consumers can listen to. */
export type Signal<Arguments extends unknown[] = []> = {
  subscribe(listener: (...args: Arguments) => void): Unsubscribe;
};

/** A signal whose owner can publish events and clear listeners. */
export type SignalEmitter<Arguments extends unknown[] = []> = Signal<Arguments> & {
  emit(...args: Arguments): void;
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
      for (const listener of Array.from(listeners)) listener(...args);
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

const eventSignalsByNode = new WeakMap<Node, Map<PropertyKey, SignalEmitter<unknown[]>>>();

/** Subscribes to an event whose listeners are cleared with the node. */
export function subscribeToNodeEvent<Arguments extends unknown[]>(
  node: Node,
  eventKey: PropertyKey,
  listener: (...args: Arguments) => void,
): Unsubscribe {
  const state = getNodeState(node);
  if (state.destroyed) throw new Error(`${state.properties.Name} has been destroyed.`);
  let signalsByEvent = eventSignalsByNode.get(node);
  if (!signalsByEvent) {
    signalsByEvent = new Map();
    eventSignalsByNode.set(node, signalsByEvent);
    const ownedSignals = signalsByEvent;
    state.cleanups.add(() => {
      for (const signal of ownedSignals.values()) signal.clear();
      eventSignalsByNode.delete(node);
    });
  }

  let eventSignal = signalsByEvent.get(eventKey);
  if (!eventSignal) {
    eventSignal = createSignal();
    signalsByEvent.set(eventKey, eventSignal);
  }
  return eventSignal.subscribe(listener as (...args: unknown[]) => void);
}

export function emitNodeEvent<Arguments extends unknown[]>(
  node: Node,
  eventKey: PropertyKey,
  ...args: Arguments
): void {
  if (getNodeState(node).destroyed) return;
  eventSignalsByNode
    .get(node)
    ?.get(eventKey)
    ?.emit(...args);
}

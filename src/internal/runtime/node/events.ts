import {
  createSignalEmitter,
  emitSignalSafely,
  type SignalEmitter,
  type Unsubscribe,
} from '#state/signal.js';

import type { Instance } from './instance.js';
import { getActiveNodeState, getNodeState } from './registry.js';

const eventSignalsByNode = new WeakMap<Instance, Map<PropertyKey, SignalEmitter<unknown[]>>>();

/** Subscribes to an owned event, connecting its source only when the first listener arrives. */
export function subscribeToNodeEvent<Arguments extends unknown[]>(
  node: Instance,
  eventKey: PropertyKey,
  listener: (...args: Arguments) => void,
  connect?: () => void,
): Unsubscribe {
  const state = getActiveNodeState(node);
  let signalsByEvent = eventSignalsByNode.get(node);
  if (!signalsByEvent) {
    signalsByEvent = new Map();
    eventSignalsByNode.set(node, signalsByEvent);
    const ownedSignals = signalsByEvent;
    state.cleanups.add(() => {
      for (const signal of ownedSignals.values()) {
        signal.clear();
      }
      eventSignalsByNode.delete(node);
    });
  }

  let eventSignal = signalsByEvent.get(eventKey);
  if (!eventSignal) {
    eventSignal = createSignalEmitter();
    signalsByEvent.set(eventKey, eventSignal);
    connect?.();
  }
  return eventSignal.subscribe(listener as (...args: unknown[]) => void);
}

export function emitNodeEvent<Arguments extends unknown[]>(
  node: Instance,
  eventKey: PropertyKey,
  ...args: Arguments
): void {
  const emitter = eventSignalsByNode.get(node)?.get(eventKey);
  if (!emitter || getNodeState(node).destroyed) {
    return;
  }
  emitSignalSafely(emitter, ...args);
}

import {
  createSignal,
  emitSignalSafely,
  type SignalEmitter,
  type Unsubscribe,
} from '../state/signal';
import type { Instance } from './instance';
import { getActiveNodeState, getNodeState } from './state';

const eventSignalsByNode = new WeakMap<Instance, Map<PropertyKey, SignalEmitter<unknown[]>>>();

/** Subscribes to an event whose listeners are cleared with the node. */
export function subscribeToNodeEvent<Arguments extends unknown[]>(
  node: Instance,
  eventKey: PropertyKey,
  listener: (...args: Arguments) => void,
): Unsubscribe {
  const state = getActiveNodeState(node);
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
  node: Instance,
  eventKey: PropertyKey,
  ...args: Arguments
): void {
  if (getNodeState(node).destroyed) return;
  const emitter = eventSignalsByNode.get(node)?.get(eventKey);
  if (emitter) emitSignalSafely(emitter, ...args);
}

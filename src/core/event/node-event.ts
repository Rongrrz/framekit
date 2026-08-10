/**
 * Associates named signals with nodes.
 * This bridges event producers such as button input, subscribers such as `on`, and node cleanup.
 */
import type { Node } from '../node/base';
import { assertNodeActive, cleanup, isDestroyed } from '../node/lifecycle';
import { signal, type Signal, type Unsubscribe } from './signal';

const eventSignalsByNode = new WeakMap<Node, Map<PropertyKey, Signal<unknown[]>>>();

/** Subscribes to a node event that is cleared when the node is destroyed. */
export function subscribeNodeEvent<Arguments extends unknown[]>(
  handle: Node,
  event: PropertyKey,
  listener: (...args: Arguments) => void,
): Unsubscribe {
  assertNodeActive(handle);

  let eventSignals = eventSignalsByNode.get(handle);
  if (!eventSignals) {
    const createdEventSignals = new Map<PropertyKey, Signal<unknown[]>>();
    eventSignals = createdEventSignals;
    eventSignalsByNode.set(handle, createdEventSignals);
    cleanup(handle, () => {
      for (const eventSignal of createdEventSignals.values()) eventSignal.clear();
      eventSignalsByNode.delete(handle);
    });
  }

  let eventSignal = eventSignals.get(event);
  if (!eventSignal) {
    eventSignal = signal();
    eventSignals.set(event, eventSignal);
  }
  return eventSignal.subscribe(listener as (...args: unknown[]) => void);
}

/** Internal event dispatcher used by capabilities such as buttons. */
export function dispatchNodeEvent<Arguments extends unknown[]>(
  handle: Node,
  event: PropertyKey,
  ...args: Arguments
): void {
  if (isDestroyed(handle)) return;
  eventSignalsByNode
    .get(handle)
    ?.get(event)
    ?.emit(...args);
}

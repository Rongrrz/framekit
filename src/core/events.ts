import { assertNodeActive, cleanup, isDestroyed, type Node } from './node';
import { signal, type Signal, type Unsubscribe } from './signal';

const nodeChannels = new WeakMap<Node, Map<PropertyKey, Signal<unknown[]>>>();

export function subscribe<Arguments extends unknown[]>(
  handle: Node,
  event: PropertyKey,
  listener: (...args: Arguments) => void,
): Unsubscribe {
  assertNodeActive(handle);

  let channels = nodeChannels.get(handle);
  if (!channels) {
    const createdChannels = new Map<PropertyKey, Signal<unknown[]>>();
    channels = createdChannels;
    nodeChannels.set(handle, createdChannels);
    cleanup(handle, () => {
      for (const channel of createdChannels.values()) channel.clear();
      nodeChannels.delete(handle);
    });
  }

  let channel = channels.get(event);
  if (!channel) {
    channel = signal<unknown[]>();
    channels.set(event, channel);
  }

  return channel.subscribe(listener as (...args: unknown[]) => void);
}

/** Internal event dispatcher used by capabilities such as buttons. */
export function dispatch<Arguments extends unknown[]>(
  handle: Node,
  event: PropertyKey,
  ...args: Arguments
): void {
  if (isDestroyed(handle)) return;
  nodeChannels
    .get(handle)
    ?.get(event)
    ?.emit(...args);
}

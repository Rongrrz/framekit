import { DestroyService } from '../destroy-service';
import type { Unsubscribe } from '../state/signal';
import type { Value } from '../state/value';
import type { Instance } from './instance';
import { getActiveNodeState } from './state';

/** Binds shared state to a node without making the state primitive own node lifecycle. */
export function watchNodeValue<T>(
  owner: Instance,
  value: Value<T>,
  listener: (value: T) => void,
): Unsubscribe {
  getActiveNodeState(owner);
  listener(value.get());

  const unsubscribe = value.onChange(listener);
  let active = true;

  function stop(): void {
    if (!active) return;
    active = false;
    removeCleanup();
    unsubscribe();
  }

  const removeCleanup = DestroyService.onDestroy(owner, stop);
  return stop;
}

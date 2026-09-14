import { DestroyService } from '../core/destroy-service';
import type { Instance, InstanceProperties } from '../core/node/instance';
import {
  applyAnimationProperties,
  claimAnimationProperties,
  releaseAnimationProperties,
  type AnimationOwner,
} from './ownership';
import { cancelAnimationTask, scheduleAnimationTask } from './scheduler';

export type AnimationRunner<Properties extends InstanceProperties> = {
  claim(properties: readonly (keyof Properties)[]): void;
  release(properties: readonly (keyof Properties)[]): void;
  apply(patch: Partial<Properties>): void;
  schedule(): void;
  cancelFrame(): void;
  isScheduled(): boolean;
  isDestroyed(): boolean;
  assertUsable(message: string): void;
};

type AnimationRunnerOptions<Properties extends InstanceProperties> = Readonly<{
  frame: (timestamp: number) => void;
  cancelPropertyFromConflict: (property: keyof Properties) => void;
  onDestroy: () => void;
}>;

/** Owns the scheduling, property claims, and node lifecycle shared by every animation. */
export function createAnimationRunner<Properties extends InstanceProperties>(
  node: Instance<Properties>,
  options: AnimationRunnerOptions<Properties>,
): AnimationRunner<Properties> {
  const claimedProperties = new Set<keyof Properties>();
  let scheduled = false;

  const owner: AnimationOwner = {
    cancelPropertyFromConflict: (property) =>
      options.cancelPropertyFromConflict(property as keyof Properties),
  };

  function claim(properties: readonly (keyof Properties)[]): void {
    claimAnimationProperties(node, properties, owner);
    for (const property of properties) claimedProperties.add(property);
  }

  function release(properties: readonly (keyof Properties)[]): void {
    releaseAnimationProperties(node, properties, owner);
    for (const property of properties) claimedProperties.delete(property);
  }

  function apply(patch: Partial<Properties>): void {
    applyAnimationProperties(node, patch, owner);
  }

  function schedule(): void {
    if (scheduled) return;
    scheduled = true;
    scheduleAnimationTask(options.frame);
  }

  function cancelFrame(): void {
    if (!scheduled) return;
    scheduled = false;
    cancelAnimationTask(options.frame);
  }

  function assertUsable(message: string): void {
    if (DestroyService.isDestroyed(node)) throw new Error(message);
  }

  DestroyService.onDestroy(node, () => {
    try {
      options.onDestroy();
    } finally {
      cancelFrame();
      release([...claimedProperties]);
    }
  });

  return Object.freeze({
    claim,
    release,
    apply,
    schedule,
    cancelFrame,
    isScheduled: () => scheduled,
    isDestroyed: () => DestroyService.isDestroyed(node),
    assertUsable,
  });
}

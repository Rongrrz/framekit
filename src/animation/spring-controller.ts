import type { Instance, InstanceProperties } from '../shared/runtime/node';
import { addCleanup, isDestroyed } from '../shared/runtime/node-lifecycle';
import { getPropertiesSnapshot } from '../shared/runtime/node-properties';
import { getActiveNodeState } from '../shared/runtime/node-state';
import { createSignal, readonlySignal, type Signal } from '../shared/runtime/signal';
import { prepareAnimationGoal } from './goal';
import {
  applyAnimationProperties,
  claimAnimationProperties,
  releaseAnimationProperties,
  type AnimationOwner,
} from './ownership';
import {
  defaultSpringOptions,
  resolveSpringOptions,
  solveSpring,
  type ResolvedSpringOptions,
  type SpringOptions,
} from './spring-physics';
import type { AnimationGoal } from './types';
import { composeAnimationValue, type AnimationValueKind } from './value';

export type { SpringOptions } from './spring-physics';

/** Playback controls for the spring retained by one node. */
export type SpringController<Properties extends InstanceProperties = InstanceProperties> = {
  /** Stops one property, or every property when omitted, at its current value. */
  stop(property?: keyof AnimationGoal<Properties>): void;
  /** Reports whether any property is currently moving. */
  isAnimating(): boolean;
  /** Emits after every active property settles. */
  readonly completed: Signal<[]>;
};

export type SpringBinding<Properties extends InstanceProperties> = {
  controller: SpringController<Properties>;
  animate(goal: AnimationGoal<Properties>, options?: SpringOptions): void;
};

type PropertySpringState = {
  kind: AnimationValueKind;
  currentComponents: number[];
  goalComponents: number[];
  velocityComponents: number[];
  options: ResolvedSpringOptions;
};
type AnimationFrame = ReturnType<typeof requestAnimationFrame>;

/** Creates the internal retained spring state for a node. */
export function createSpringBinding<Properties extends InstanceProperties>(
  node: Instance<Properties>,
): SpringBinding<Properties> {
  getActiveNodeState(node);
  const springsByProperty = new Map<keyof Properties, PropertySpringState>();
  const completedEmitter = createSignal<[]>();
  const completed = readonlySignal(completedEmitter);
  let animationFrame: AnimationFrame | undefined;
  let previousTimestampMs = 0;
  let disposed = false;

  const animationOwner: AnimationOwner = {
    cancelPropertyFromConflict: (property) => stopProperty(property as keyof Properties),
  };

  function animate(goal: AnimationGoal<Properties>, options?: SpringOptions): void {
    assertUsable();
    const springOptions = resolveSpringOptions(options ?? {}, defaultSpringOptions);
    const preparedGoal = prepareAnimationGoal(node, goal, 'spring', (property, currentValue) => {
      const existingSpring = springsByProperty.get(property);
      return existingSpring
        ? composeAnimationValue(existingSpring.kind, existingSpring.currentComponents)
        : currentValue;
    });
    const preparedSprings = new Map<
      keyof Properties,
      { kind: AnimationValueKind; goalComponents: number[]; startComponents: number[] }
    >();
    for (const { property, start, goal: propertyGoal } of preparedGoal) {
      preparedSprings.set(property, {
        kind: propertyGoal.kind,
        goalComponents: propertyGoal.numbers,
        startComponents: start.numbers,
      });
    }

    const goalProperties = preparedGoal.map(({ property }) => property);
    claimAnimationProperties(node, goalProperties, animationOwner);
    for (const [property, preparedSpring] of preparedSprings) {
      const existingSpring = springsByProperty.get(property);
      if (existingSpring) {
        existingSpring.goalComponents = preparedSpring.goalComponents;
        existingSpring.options = springOptions;
      } else {
        springsByProperty.set(property, {
          kind: preparedSpring.kind,
          currentComponents: preparedSpring.startComponents,
          goalComponents: preparedSpring.goalComponents,
          velocityComponents: preparedSpring.startComponents.map(() => 0),
          options: springOptions,
        });
      }
    }
    scheduleNextFrame();
  }

  function stop(property?: keyof AnimationGoal<Properties>): void {
    assertUsable();
    if (property !== undefined) {
      stopProperty(property as keyof Properties);
      return;
    }
    stopAllProperties();
  }

  function stopAllProperties(): void {
    const properties = Array.from(springsByProperty.keys());
    springsByProperty.clear();
    releaseAnimationProperties(node, properties, animationOwner);
    cancelFrame();
  }

  function stopProperty(property: keyof Properties): void {
    if (!springsByProperty.delete(property)) return;
    releaseAnimationProperties(node, [property], animationOwner);
    if (springsByProperty.size === 0) cancelFrame();
  }

  function scheduleNextFrame(): void {
    if (animationFrame !== undefined) return;
    previousTimestampMs = performance.now();
    animationFrame = requestAnimationFrame(advanceSprings);
  }

  function advanceSprings(timestampMs: number): void {
    animationFrame = undefined;
    if (springsByProperty.size === 0 || isDestroyed(node)) return;
    const deltaTimeSeconds = Math.max(0, (timestampMs - previousTimestampMs) / 1000);
    previousTimestampMs = timestampMs;
    const patch: Partial<Properties> = {};
    const settledProperties: (keyof Properties)[] = [];

    for (const [property, springState] of springsByProperty) {
      let propertySettled = true;
      for (let index = 0; index < springState.currentComponents.length; index += 1) {
        const nextComponent = solveSpring(
          springState.currentComponents[index]!,
          springState.velocityComponents[index]!,
          springState.goalComponents[index]!,
          deltaTimeSeconds,
          springState.options,
        );
        springState.currentComponents[index] = nextComponent.value;
        springState.velocityComponents[index] = nextComponent.velocity;
        if (
          Math.abs(nextComponent.value - springState.goalComponents[index]!) >
            springState.options.precision ||
          Math.abs(nextComponent.velocity) > springState.options.restVelocity
        ) {
          propertySettled = false;
        }
      }

      if (propertySettled) {
        springState.currentComponents = [...springState.goalComponents];
        springState.velocityComponents.fill(0);
        settledProperties.push(property);
      }
      patch[property] = composeAnimationValue(
        springState.kind,
        springState.currentComponents,
      ) as Properties[keyof Properties];
    }

    try {
      applyAnimationProperties(node, patch, animationOwner);
    } catch (error) {
      stopAllProperties();
      throw error;
    }
    for (const property of settledProperties) springsByProperty.delete(property);
    releaseAnimationProperties(node, settledProperties, animationOwner);
    if (springsByProperty.size === 0) completedEmitter.emit();
    else animationFrame = requestAnimationFrame(advanceSprings);
  }

  function cancelFrame(): void {
    if (animationFrame === undefined) return;
    cancelAnimationFrame(animationFrame);
    animationFrame = undefined;
  }

  function assertUsable(): void {
    if (disposed || isDestroyed(node)) throw new Error(`${nodeName(node)} has been destroyed.`);
  }

  addCleanup(node, () => {
    stopAllProperties();
    disposed = true;
    completedEmitter.clear();
  });

  const controller = Object.freeze({
    stop,
    isAnimating: () => springsByProperty.size > 0,
    completed,
  });

  return { controller, animate };
}

function nodeName(node: Instance): string {
  if (isDestroyed(node)) return 'Instance';
  return getPropertiesSnapshot(node).Name;
}

import type { Instance, InstanceProperties } from '../runtime/node';
import { onDestroy, isDestroyed } from '../runtime/node-lifecycle';
import { getActiveNodeState } from '../runtime/node-state';
import { createSignal, readonlySignal, type Signal } from '../runtime/signal';
import { prepareAnimationGoal } from './goal';
import {
  applyAnimationProperties,
  claimAnimationProperties,
  releaseAnimationProperties,
  type AnimationOwner,
} from './ownership';
import { cancelAnimationTask, scheduleAnimationTask } from './scheduler';
import {
  defaultSpringOptions,
  resolveSpringOptions,
  solveSpring,
  type ResolvedSpringOptions,
  type SpringSolution,
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

/** Creates the internal retained spring state for a node. */
export function createSpringBinding<Properties extends InstanceProperties>(
  node: Instance<Properties>,
): SpringBinding<Properties> {
  getActiveNodeState(node);
  const springsByProperty = new Map<keyof Properties, PropertySpringState>();
  const animationPatch: Partial<Properties> = {};
  const settledProperties: (keyof Properties)[] = [];
  const springSolution: SpringSolution = { value: 0, velocity: 0 };
  const completedEmitter = createSignal<[]>();
  const completed = readonlySignal(completedEmitter);
  let scheduled = false;
  let previousTimestampMs = 0;

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
    const goalProperties = preparedGoal.map(({ property }) => property);
    claimAnimationProperties(node, goalProperties, animationOwner);

    for (const { property, start, goal: target } of preparedGoal) {
      const existingSpring = springsByProperty.get(property);
      if (existingSpring) {
        existingSpring.goalComponents = target.components;
        existingSpring.options = springOptions;
        continue;
      }

      springsByProperty.set(property, {
        kind: target.kind,
        currentComponents: start.components,
        goalComponents: target.components,
        velocityComponents: start.components.map(() => 0),
        options: springOptions,
      });
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
    for (const property of properties) delete animationPatch[property];
    releaseAnimationProperties(node, properties, animationOwner);
    cancelFrame();
  }

  function stopProperty(property: keyof Properties): void {
    if (!springsByProperty.delete(property)) return;
    delete animationPatch[property];
    releaseAnimationProperties(node, [property], animationOwner);
    if (springsByProperty.size === 0) cancelFrame();
  }

  function scheduleNextFrame(): void {
    if (scheduled) return;
    previousTimestampMs = performance.now();
    scheduled = true;
    scheduleAnimationTask(advanceSprings);
  }

  function advanceSprings(timestampMs: number): void {
    if (springsByProperty.size === 0 || isDestroyed(node)) {
      cancelFrame();
      return;
    }
    const deltaTimeSeconds = Math.max(0, (timestampMs - previousTimestampMs) / 1000);
    previousTimestampMs = timestampMs;
    settledProperties.length = 0;

    for (const [property, springState] of springsByProperty) {
      if (advancePropertySpring(springState, deltaTimeSeconds, springSolution)) {
        settledProperties.push(property);
      }
      animationPatch[property] = composeAnimationValue(
        springState.kind,
        springState.currentComponents,
      ) as Properties[keyof Properties];
    }

    try {
      applyAnimationProperties(node, animationPatch, animationOwner);
    } catch (error) {
      stopAllProperties();
      throw error;
    }
    for (const property of settledProperties) {
      springsByProperty.delete(property);
      delete animationPatch[property];
    }
    releaseAnimationProperties(node, settledProperties, animationOwner);
    if (springsByProperty.size === 0) {
      cancelFrame();
      completedEmitter.emit();
    }
  }

  function cancelFrame(): void {
    if (!scheduled) return;
    scheduled = false;
    cancelAnimationTask(advanceSprings);
  }

  function assertUsable(): void {
    if (isDestroyed(node)) throw new Error('Instance has been destroyed.');
  }

  onDestroy(node, () => {
    stopAllProperties();
    completedEmitter.clear();
  });

  const controller = Object.freeze({
    stop,
    isAnimating: () => springsByProperty.size > 0,
    completed,
  });

  return { controller, animate };
}

/** Advances every component together so structured values settle as a single property. */
function advancePropertySpring(
  state: PropertySpringState,
  deltaTimeSeconds: number,
  solution: SpringSolution,
): boolean {
  let settled = true;
  for (let index = 0; index < state.currentComponents.length; index += 1) {
    const goal = state.goalComponents[index]!;
    const next = solveSpring(
      state.currentComponents[index]!,
      state.velocityComponents[index]!,
      goal,
      deltaTimeSeconds,
      state.options,
      solution,
    );
    state.currentComponents[index] = next.value;
    state.velocityComponents[index] = next.velocity;
    if (
      Math.abs(next.value - goal) > state.options.precision ||
      Math.abs(next.velocity) > state.options.restVelocity
    ) {
      settled = false;
    }
  }

  if (settled) {
    state.currentComponents = [...state.goalComponents];
    state.velocityComponents.fill(0);
  }
  return settled;
}

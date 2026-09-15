import type { Instance, InstanceProperties } from '../core/node/instance';
import { getActiveNodeState } from '../core/node/state';
import { createSignal, emitSignalSafely, readonlySignal, type Signal } from '../core/state/signal';
import { prepareAnimationGoal } from './goal';
import { createAnimationRunner } from './runner';
import {
  defaultSpringOptions,
  resolveSpringOptions,
  solveSpring,
  type ResolvedSpringOptions,
  type SpringSolution,
  type SpringOptions,
} from './spring-physics';
import type { AnimatableProperty, AnimationGoal } from './types';
import { composeAnimationValue, type AnimationValueKind } from './value';

export type { SpringOptions } from './spring-physics';

/** Playback controls for the spring retained by one node. */
export type SpringController<Properties extends InstanceProperties = InstanceProperties> = {
  /** Stops one property, or every property when omitted, at its current value. */
  stop(property?: AnimatableProperty<Properties>): void;
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
  let previousTimestampMs = 0;

  const runner = createAnimationRunner(node, {
    frame: advanceSprings,
    cancelPropertyFromConflict: stopProperty,
    onDestroy: () => {
      springsByProperty.clear();
      completedEmitter.clear();
    },
  });

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
    runner.claim(goalProperties);

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

  function stop(property?: AnimatableProperty<Properties>): void {
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
    runner.release(properties);
    cancelFrame();
  }

  function stopProperty(property: keyof Properties): void {
    if (!springsByProperty.delete(property)) return;
    delete animationPatch[property];
    runner.release([property]);
    if (springsByProperty.size === 0) cancelFrame();
  }

  function scheduleNextFrame(): void {
    if (runner.isScheduled()) return;
    previousTimestampMs = performance.now();
    runner.schedule();
  }

  function advanceSprings(timestampMs: number): void {
    if (springsByProperty.size === 0 || runner.isDestroyed()) {
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
      runner.apply(animationPatch);
    } catch (error) {
      stopAllProperties();
      throw error;
    }
    for (const property of settledProperties) {
      springsByProperty.delete(property);
      delete animationPatch[property];
    }
    runner.release(settledProperties);
    if (springsByProperty.size === 0) {
      cancelFrame();
      emitSignalSafely(completedEmitter);
    }
  }

  function cancelFrame(): void {
    runner.cancelFrame();
  }

  function assertUsable(): void {
    runner.assertUsable('Instance has been destroyed.');
  }

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

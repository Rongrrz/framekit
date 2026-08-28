import { addCleanup, assertNodeActive, isDestroyed, props, update } from '../runtime/node';
import { createSignal, type Signal } from '../runtime/signal';
import type { Node, NodeProps } from '../runtime/state';
import {
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
import {
  assertCompatibleAnimationValues,
  composeAnimationValue,
  decomposeAnimationValue,
  type AnimationValueKind,
} from './value';

export type { SpringOptions } from './spring-physics';

export type Motion<Props extends NodeProps = NodeProps> = {
  /** Retargets properties without discarding their current velocity. */
  spring(goal: AnimationGoal<Props>): void;
  /** Retargets properties using settings for only the properties in this goal. */
  spring(goal: AnimationGoal<Props>, settings: SpringOptions): void;
  /** Stops one property, or every property when omitted, at its current value. */
  stop(property?: keyof AnimationGoal<Props>): void;
  isAnimating(): boolean;
  readonly completed: Signal<[]>;
};

type PropertySpringState = {
  kind: AnimationValueKind;
  currentComponents: number[];
  goalComponents: number[];
  velocityComponents: number[];
  options: ResolvedSpringOptions;
};
type AnimationFrame = ReturnType<typeof requestAnimationFrame>;

/** Creates a retained motion controller whose spring can be freely retargeted. */
export function createMotion<Props extends NodeProps>(
  node: Node<Props>,
  options: SpringOptions = {},
): Motion<Props> {
  assertNodeActive(node);
  const controllerOptions = resolveSpringOptions(options, defaultSpringOptions);
  const springsByProperty = new Map<keyof Props, PropertySpringState>();
  const completed = createSignal<[]>();
  let animationFrame: AnimationFrame | undefined;
  let previousTimestampMs = 0;
  let disposed = false;

  const animationOwner: AnimationOwner = {
    cancelPropertyFromConflict: (property) => stopProperty(property as keyof Props),
  };

  function spring(goal: AnimationGoal<Props>): void;
  function spring(goal: AnimationGoal<Props>, settings: SpringOptions): void;
  function spring(goal: AnimationGoal<Props>, settings?: SpringOptions): void {
    assertUsable();
    const springOptions = settings
      ? resolveSpringOptions(settings, controllerOptions)
      : controllerOptions;
    const goalEntries = Object.entries(goal) as [keyof Props, unknown][];
    if (goalEntries.length === 0) throw new TypeError('A spring needs at least one goal property.');

    const currentProps = props(node);
    const preparedSprings = new Map<
      keyof Props,
      { kind: AnimationValueKind; goalComponents: number[]; startComponents: number[] }
    >();
    for (const [property, goalValue] of goalEntries) {
      if (!Object.hasOwn(currentProps, property)) {
        throw new TypeError(
          `Unknown spring property "${String(property)}" on ${currentProps.Name}.`,
        );
      }
      const decomposedGoal = decomposeAnimationValue(goalValue, String(property));
      const existingSpring = springsByProperty.get(property);
      if (existingSpring) {
        assertCompatibleAnimationValues(
          { kind: existingSpring.kind, numbers: existingSpring.currentComponents },
          decomposedGoal,
          String(property),
        );
        preparedSprings.set(property, {
          kind: decomposedGoal.kind,
          goalComponents: decomposedGoal.numbers,
          startComponents: existingSpring.currentComponents,
        });
      } else {
        const decomposedStart = decomposeAnimationValue(currentProps[property], String(property));
        assertCompatibleAnimationValues(decomposedStart, decomposedGoal, String(property));
        preparedSprings.set(property, {
          kind: decomposedGoal.kind,
          goalComponents: decomposedGoal.numbers,
          startComponents: decomposedStart.numbers,
        });
      }
    }

    const goalProperties = goalEntries.map(([property]) => property);
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

  function stop(property?: keyof AnimationGoal<Props>): void {
    assertUsable();
    if (property !== undefined) {
      stopProperty(property as keyof Props);
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

  function stopProperty(property: keyof Props): void {
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
    const patch: Partial<Props> = {};
    const settledProperties: (keyof Props)[] = [];

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
      ) as Props[keyof Props];
    }

    try {
      update(node, patch);
    } catch (error) {
      stopAllProperties();
      throw error;
    }
    for (const property of settledProperties) springsByProperty.delete(property);
    releaseAnimationProperties(node, settledProperties, animationOwner);
    if (springsByProperty.size === 0) completed.emit();
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
    completed.clear();
  });

  return Object.freeze({
    spring,
    stop,
    isAnimating: () => springsByProperty.size > 0,
    completed,
  });
}

function nodeName(node: Node): string {
  if (isDestroyed(node)) return 'Node';
  return props(node).Name;
}
